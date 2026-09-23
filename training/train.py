#!/usr/bin/env python
"""
Helix-Derm skin lesion classifier — training pipeline.

Dataset: ISIC 2019 (8 classes: AK, BCC, BKL, DF, MEL, NV, SCC, VASC), stored as
parquet with raw 128x128x3 RGB uint8 bytes per image.

Phases (run in order):
  python train.py convert    # parquet -> npy memmap arrays
  python train.py extract    # frozen-backbone feature cache (train+val+test)
  python train.py head       # train MLP head on cached features, evaluate
  python train.py finetune   # fine-tune backbone (top blocks), evaluate each epoch
  python train.py export     # export best model to TorchScript + metrics json
"""
import io
import json
import math
import os
import sys
import time

import numpy as np
import pyarrow.parquet as pq
import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image

torch.set_num_threads(2)
torch.manual_seed(1337)
np.random.seed(1337)

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, "data")
ART = os.path.join(ROOT, "artifacts")
os.makedirs(ART, exist_ok=True)

CLASSES = ["AK", "BCC", "BKL", "DF", "MEL", "NV", "SCC", "VASC"]
IMG = 128
BATCH = 32
VAL_FRAC = 0.10
DEVICE = torch.device("cpu")

try:
    import timm
except ImportError:
    print("timm missing"); sys.exit(1)

MODEL_NAME = "mobilenetv3_large_100.ra_in1k"


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", flush=True)


# ------------------------------------------------------------------ convert
def convert():
    for split in ["train", "test"]:
        pf = pq.ParquetFile(os.path.join(DATA, f"{split}.parquet"))
        n = pf.metadata.num_rows
        imgs = np.lib.format.open_memmap(
            os.path.join(DATA, f"{split}_imgs.npy"), mode="w+",
            dtype=np.uint8, shape=(n, IMG, IMG, 3))
        labels = np.lib.format.open_memmap(
            os.path.join(DATA, f"{split}_labels.npy"), mode="w+",
            dtype=np.int64, shape=(n,))
        idx = 0
        t0 = time.time()
        for batch in pf.iter_batches(batch_size=1024):
            imgs_b = batch.column("image").to_pylist()
            labs_b = batch.column("label").to_pylist()
            arr = np.frombuffer(b"".join(imgs_b), dtype=np.uint8)
            arr = arr.reshape(-1, IMG, IMG, 3)
            k = len(imgs_b)
            imgs[idx:idx + k] = arr
            labels[idx:idx + k] = [CLASSES.index(l) for l in labs_b]
            idx += k
            if idx % 5120 == 0:
                log(f"{split}: {idx}/{n} ({time.time()-t0:.0f}s)")
        imgs.flush(); labels.flush()
        log(f"{split}: wrote {n} rows, class counts: "
            f"{dict(zip(CLASSES, np.bincount(np.asarray(labels), minlength=8).tolist()))}")


# ------------------------------------------------------------------ data
def load_arrays(split):
    imgs = np.load(os.path.join(DATA, f"{split}_imgs.npy"), mmap_mode="r")
    labels = np.load(os.path.join(DATA, f"{split}_labels.npy"))
    return imgs, labels


def make_splits():
    """Deterministic stratified train/val split of the train parquet."""
    path = os.path.join(DATA, "split.json")
    if os.path.exists(path):
        with open(path) as f:
            s = json.load(f)
        return np.array(s["train"]), np.array(s["val"])
    _, labels = load_arrays("train")
    rng = np.random.default_rng(42)
    tr, va = [], []
    for c in range(len(CLASSES)):
        ids = np.where(labels == c)[0]
        rng.shuffle(ids)
        k = max(1, int(len(ids) * VAL_FRAC))
        va.append(ids[:k]); tr.append(ids[k:])
    tr = np.sort(np.concatenate(tr)); va = np.sort(np.concatenate(va))
    with open(path, "w") as f:
        json.dump({"train": tr.tolist(), "val": va.tolist()}, f)
    return tr, va


class ImgDataset(torch.utils.data.Dataset):
    """uint8 memmap dataset; augmentation applied on tensors when augment=True."""

    def __init__(self, indices, split="train", augment=False):
        self.imgs, labels = load_arrays(split)
        self.idx = indices
        self.labels = labels[indices]
        self.augment = augment

    def __len__(self):
        return len(self.idx)

    def __getitem__(self, i):
        arr = np.asarray(self.imgs[self.idx[i]], dtype=np.uint8).copy()
        x = torch.from_numpy(arr).permute(2, 0, 1).float()  # CHW 0..255
        if self.augment:
            x = augment(x)
        x = x.div_(255.0)
        x = (x - MEAN) / STD
        return x, int(self.labels[i])


MEAN = torch.tensor([0.485, 0.456, 0.406]).view(3, 1, 1)
STD = torch.tensor([0.229, 0.224, 0.225]).view(3, 1, 1)


def augment(x):
    if torch.rand(1) < 0.5: x = torch.flip(x, [2])
    if torch.rand(1) < 0.5: x = torch.flip(x, [1])
    k = int(torch.randint(0, 4, (1,)))
    if k: x = torch.rot90(x, k, [1, 2])
    # color jitter
    if torch.rand(1) < 0.8:
        b = 1 + (torch.rand(1) - 0.5) * 0.4
        c = 1 + (torch.rand(1) - 0.5) * 0.4
        s = 1 + (torch.rand(1) - 0.5) * 0.4
        x = x * b
        mean = x.mean(dim=[1, 2], keepdim=True)
        x = (x - mean) * c + mean
        mean = x.mean(dim=[1, 2], keepdim=True)
        x = (x - mean) * s + mean
    # random translate/scale crop
    if torch.rand(1) < 0.6:
        sc = 0.8 + float(torch.rand(1)) * 0.4
        sz = int(IMG * sc)
        x = F.interpolate(x.unsqueeze(0), size=(sz, sz), mode="bilinear",
                          align_corners=False)[0]
        if sz >= IMG:
            top = int(torch.randint(0, sz - IMG + 1, (1,)))
            left = int(torch.randint(0, sz - IMG + 1, (1,)))
            x = x[:, top:top + IMG, left:left + IMG]
        else:
            pad = (IMG - sz) // 2
            x = F.pad(x, (pad, IMG - sz - pad, pad, IMG - sz - pad),
                      mode="replicate")
    return x.clamp(0, 255)


# ------------------------------------------------------------------ model
def build_backbone(num_classes=0):
    m = timm.create_model(MODEL_NAME, pretrained=True, num_classes=num_classes)
    return m


def backbone_out_dim():
    """Measure the actual pooled-feature width with a dummy forward pass."""
    m = build_backbone(0).eval()
    with torch.no_grad():
        return int(m(torch.zeros(1, 3, IMG, IMG)).shape[1])


# ------------------------------------------------------------------ extract
@torch.no_grad()
def extract():
    tr, va = make_splits()
    model = build_backbone(0).eval()
    with torch.no_grad():
        dim = int(model(torch.zeros(1, 3, IMG, IMG)).shape[1])
    log(f"feature dim: {dim}")
    sets = {
        "tr": ("train", tr), "va": ("train", va), "te": ("test",
               np.arange(len(load_arrays("test")[1]))),
    }
    for tag, (split, idx) in sets.items():
        out_path = os.path.join(ART, f"feat_{tag}.npy")
        lab_path = os.path.join(ART, f"lab_{tag}.npy")
        ds = ImgDataset(idx, split, augment=False)
        dl = torch.utils.data.DataLoader(ds, batch_size=BATCH, num_workers=2,
                                         shuffle=False)
        feats = np.lib.format.open_memmap(out_path, mode="w+", dtype=np.float16,
                                          shape=(len(ds), dim))
        labs = np.empty(len(ds), dtype=np.int64)
        t0 = time.time(); p = 0
        for xb, yb in dl:
            fb = model(xb).numpy()
            feats[p:p + len(fb)] = fb
            labs[p:p + len(fb)] = yb.numpy()
            p += len(fb)
            if p // 2560 > (p - len(fb)) // 2560:
                log(f"extract {tag}: {p}/{len(ds)} ({time.time()-t0:.0f}s)")
        feats.flush()
        np.save(lab_path, labs)
        log(f"extract {tag}: done {len(ds)} x {dim} in {time.time()-t0:.0f}s")


# ------------------------------------------------------------------ head
def train_head():
    tr, va = make_splits()
    ftr = np.load(os.path.join(ART, "feat_tr.npy"), mmap_mode="r")
    fva = np.load(os.path.join(ART, "feat_va.npy"), mmap_mode="r")
    fte = np.load(os.path.join(ART, "feat_te.npy"), mmap_mode="r")
    ltr = np.load(os.path.join(ART, "lab_tr.npy"))
    lva = np.load(os.path.join(ART, "lab_va.npy"))
    lte = np.load(os.path.join(ART, "lab_te.npy"))
    dim = ftr.shape[1]

    counts = np.bincount(ltr, minlength=len(CLASSES)).astype(np.float32)
    weights = (counts.sum() / (len(CLASSES) * counts)) ** 0.5
    weights = weights / weights.sum() * len(CLASSES)
    class_w = torch.tensor(weights, dtype=torch.float32)
    log(f"class weights: {np.round(weights,2).tolist()}")

    head = nn.Sequential(
        nn.LayerNorm(dim), nn.Dropout(0.25),
        nn.Linear(dim, 512), nn.GELU(), nn.Dropout(0.35),
        nn.Linear(512, len(CLASSES)),
    )
    opt = torch.optim.AdamW(head.parameters(), lr=1e-3, weight_decay=1e-4)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, 1e-3, total_steps=200 * 20)
    ce = nn.CrossEntropyLoss(weight=class_w, label_smoothing=0.05)

    trt = torch.utils.data.TensorDataset(torch.from_numpy(np.asarray(ftr)).half().float(),
                                         torch.from_numpy(ltr))
    dl = torch.utils.data.DataLoader(trt, batch_size=256, shuffle=True)

    best = -1
    for ep in range(20):
        head.train()
        for xb, yb in dl:
            opt.zero_grad()
            loss = ce(head(xb), yb)
            loss.backward()
            opt.step()
            sched.step()
        head.eval()
        with torch.no_grad():
            va_acc = accuracy(head, torch.from_numpy(np.asarray(fva)).float(), lva)
            te_acc = accuracy(head, torch.from_numpy(np.asarray(fte)).float(), lte)
        log(f"head ep{ep+1}: val={va_acc['acc']:.4f} bal={va_acc['bal']:.4f} | test={te_acc['acc']:.4f} bal={te_acc['bal']:.4f}")
        if va_acc["bal"] > best:
            best = va_acc["bal"]
            torch.save(head.state_dict(), os.path.join(ART, "head_best.pt"))
            json.dump({"val": va_acc, "test": te_acc, "epoch": ep + 1},
                      open(os.path.join(ART, "head_metrics.json"), "w"), indent=2)
    log(f"head best val balanced acc: {best:.4f}")


@torch.no_grad()
def accuracy(model, X, y, bs=1024):
    model.eval()
    preds = []
    for i in range(0, len(X), bs):
        preds.append(model(X[i:i + bs]).argmax(1).numpy())
    p = np.concatenate(preds)
    acc = float((p == y).mean())
    per = []
    for c in range(len(CLASSES)):
        m = y == c
        if m.sum(): per.append(float((p[m] == c).mean()))
    return {"acc": acc, "bal": float(np.mean(per)),
            "per_class": {CLASSES[c]: round(per[c], 4) for c in range(len(CLASSES))}}


# ------------------------------------------------------------------ finetune
class FullModel(nn.Module):
    """Backbone (pooled 1280-d features) + MLP head.

    The head mirrors the architecture used in the `head` phase, and is
    initialized from head_best.pt when present, so fine-tuning starts from the
    strong frozen-feature solution instead of a random linear layer.
    """

    def __init__(self, num_classes=len(CLASSES)):
        super().__init__()
        self.backbone = build_backbone(0)  # -> pooled features
        dim = self.backbone.num_features
        with torch.no_grad():  # measure real width (timm reports it lazily)
            dim = int(self.backbone(torch.zeros(1, 3, IMG, IMG)).shape[1])
        self.head = nn.Sequential(
            nn.LayerNorm(dim), nn.Dropout(0.25),
            nn.Linear(dim, 512), nn.GELU(), nn.Dropout(0.35),
            nn.Linear(512, num_classes),
        )
        hb = os.path.join(ART, "head_best.pt")
        if os.path.exists(hb):
            try:
                self.head.load_state_dict(torch.load(hb, weights_only=True))
                log("head initialized from head_best.pt")
            except Exception as e:
                log(f"head init skipped ({e})")

    def forward(self, x):
        return self.head(self.backbone(x))


def class_weighted_sampler(labels):
    counts = np.bincount(labels, minlength=len(CLASSES)).astype(np.float64)
    w = (1.0 / counts)[labels]
    return torch.utils.data.WeightedRandomSampler(
        torch.from_numpy(w), num_samples=len(labels), replacement=True)


def finetune(epochs=6, warmup_epochs=2):
    """Two-phase fine-tune:
    Phase A (warmup_epochs): backbone frozen, only the fresh classifier trains
    at a high LR — prevents destroying ImageNet features with random-head
    gradients. Phase B: full network, discriminative LRs (backbone ~10x lower).
    """
    tr, va = make_splits()
    dtr = ImgDataset(tr, "train", augment=True)
    dva = ImgDataset(va, "train", augment=False)
    dte = ImgDataset(np.arange(len(load_arrays("test")[1])), "test", augment=False)
    ltr = dtr.labels
    sampler = class_weighted_sampler(ltr)
    dltr = torch.utils.data.DataLoader(dtr, batch_size=BATCH, sampler=sampler,
                                       num_workers=0, drop_last=True)
    dlva = torch.utils.data.DataLoader(dva, batch_size=BATCH, num_workers=0)
    dlte = torch.utils.data.DataLoader(dte, batch_size=BATCH, num_workers=0)

    model = FullModel()
    # Freeze BN affine params outright; running stats stay at ImageNet values.
    n_bn = 0
    for mod in model.backbone.modules():
        if isinstance(mod, (nn.BatchNorm1d, nn.BatchNorm2d)):
            mod.eval()
            for p in mod.parameters():
                p.requires_grad_(False)
            n_bn += 1
    # The weighted sampler already balances classes, so the CE stays
    # unweighted — weighting both double-corrects and wrecks the prior.
    ce = nn.CrossEntropyLoss(label_smoothing=0.05)

    steps_per_epoch = len(dltr)
    best = -1
    total_epochs = warmup_epochs + epochs

    def save_if_best(tag):
        nonlocal best
        va_m = evaluate(model, dlva)
        te_m = evaluate(model, dlte)
        log(f"{tag}: val={va_m['acc']:.4f} bal={va_m['bal']:.4f} | "
            f"test={te_m['acc']:.4f} bal={te_m['bal']:.4f}")
        if va_m["bal"] > best:
            best = va_m["bal"]
            torch.save(model.state_dict(), os.path.join(ART, "ft_best.pt"))
            json.dump({"val": va_m, "test": te_m, "epoch": tag,
                       "model": MODEL_NAME, "img": IMG,
                       "train_images": int(len(tr) + len(va)),
                       "test_images": int(len(dte))},
                      open(os.path.join(ART, "ft_metrics.json"), "w"), indent=2)
            log(f"  -> saved new best (val bal {best:.4f})")

    def run_epoch(opt, sched, ep_label):
        model.train()
        # Small-batch fine-tune: keep BN on ImageNet running stats (batch-32
        # batch-stats are far too noisy and desync features from the head).
        for mod in model.backbone.modules():
            if isinstance(mod, (nn.BatchNorm1d, nn.BatchNorm2d)):
                mod.eval()
        t0 = time.time(); tot = 0.0
        for i, (xb, yb) in enumerate(dltr):
            opt.zero_grad()
            loss = ce(model(xb), yb)
            loss.backward()
            opt.step(); sched.step()
            tot += float(loss.detach())
            if (i + 1) % 100 == 0:
                log(f"  {ep_label} step {i+1}/{steps_per_epoch} "
                    f"loss={tot/(i+1):.4f} ({time.time()-t0:.0f}s)")
        log(f"  {ep_label} done, final loss={tot/steps_per_epoch:.4f} "
            f"({time.time()-t0:.0f}s)")

    # ---- phase A: head only (backbone frozen) ----
    for p in model.backbone.parameters():
        p.requires_grad_(False)
    head_params = list(model.head.parameters())
    opt = torch.optim.AdamW(head_params, lr=7.5e-4, weight_decay=0.0)
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, 7.5e-4, total_steps=steps_per_epoch * warmup_epochs)
    log(f"phase A: classifier-only, {sum(p.numel() for p in head_params)/1e3:.0f}K params")
    for e in range(warmup_epochs):
        run_epoch(opt, sched, f"warm{e+1}")
        save_if_best(f"warm{e+1}")

    # ---- phase B: full network, discriminative LRs, no wd on norm/bias ----
    for p in model.backbone.parameters():
        p.requires_grad_(True)
    decay, no_decay = [], []
    for name, p in model.backbone.named_parameters():
        (no_decay if (p.ndim <= 1 or name.endswith(".bias")) else decay).append(p)
    groups = [
        {"params": decay, "lr": 1.2e-4, "weight_decay": 0.01},
        {"params": no_decay, "lr": 1.2e-4, "weight_decay": 0.0},
        {"params": list(model.head.parameters()),
         "lr": 7.5e-4, "weight_decay": 0.0},
    ]
    opt = torch.optim.AdamW(groups)
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=[1.2e-4, 1.2e-4, 7.5e-4],
        total_steps=steps_per_epoch * epochs)
    log(f"phase B: full fine-tune, "
        f"{sum(p.numel() for p in model.parameters() if p.requires_grad)/1e6:.2f}M params")
    for e in range(epochs):
        run_epoch(opt, sched, f"ep{e+1}")
        save_if_best(f"ep{e+1}")
    log(f"finetune best val balanced acc: {best:.4f}")


def finetune_more(epochs=6):
    """Continue training from ft_best.pt with a fresh OneCycle (lower peak LR)."""
    tr, va = make_splits()
    dtr = ImgDataset(tr, "train", augment=True)
    dva = ImgDataset(va, "train", augment=False)
    dte = ImgDataset(np.arange(len(load_arrays("test")[1])), "test", augment=False)
    ltr = dtr.labels
    sampler = class_weighted_sampler(ltr)
    dltr = torch.utils.data.DataLoader(dtr, batch_size=BATCH, sampler=sampler,
                                       num_workers=0, drop_last=True)
    dlva = torch.utils.data.DataLoader(dva, batch_size=BATCH, num_workers=0)
    dlte = torch.utils.data.DataLoader(dte, batch_size=BATCH, num_workers=0)

    model = FullModel()
    model.load_state_dict(torch.load(os.path.join(ART, "ft_best.pt"),
                                     weights_only=True))
    for mod in model.backbone.modules():
        if isinstance(mod, (nn.BatchNorm1d, nn.BatchNorm2d)):
            mod.eval()
            for p in mod.parameters():
                p.requires_grad_(False)
    ce = nn.CrossEntropyLoss(label_smoothing=0.05)

    decay, no_decay = [], []
    for name, p in model.backbone.named_parameters():
        if not p.requires_grad:
            continue
        (no_decay if (p.ndim <= 1 or name.endswith(".bias")) else decay).append(p)
    groups = [
        {"params": decay, "lr": 8e-5, "weight_decay": 0.01},
        {"params": no_decay, "lr": 8e-5, "weight_decay": 0.0},
        {"params": list(model.head.parameters()), "lr": 5e-4, "weight_decay": 0.0},
    ]
    opt = torch.optim.AdamW(groups)
    steps_per_epoch = len(dltr)
    sched = torch.optim.lr_scheduler.OneCycleLR(
        opt, max_lr=[8e-5, 8e-5, 5e-4], total_steps=steps_per_epoch * epochs)

    with open(os.path.join(ART, "ft_metrics.json")) as f:
        prev = json.load(f)
    best = prev["val"]["bal"]
    log(f"finetune_more: resuming from val bal {best:.4f}")

    for ep in range(epochs):
        model.train()
        for mod in model.backbone.modules():
            if isinstance(mod, (nn.BatchNorm1d, nn.BatchNorm2d)):
                mod.eval()
        t0 = time.time(); tot = 0.0
        for i, (xb, yb) in enumerate(dltr):
            opt.zero_grad()
            loss = ce(model(xb), yb)
            loss.backward()
            opt.step(); sched.step()
            tot += float(loss.detach())
            if (i + 1) % 100 == 0:
                log(f"  more{ep+1} step {i+1}/{steps_per_epoch} "
                    f"loss={tot/(i+1):.4f} ({time.time()-t0:.0f}s)")
        va_m = evaluate(model, dlva)
        te_m = evaluate(model, dlte)
        log(f"more{ep+1}: val={va_m['acc']:.4f} bal={va_m['bal']:.4f} | "
            f"test={te_m['acc']:.4f} bal={te_m['bal']:.4f}")
        if va_m["bal"] > best:
            best = va_m["bal"]
            torch.save(model.state_dict(), os.path.join(ART, "ft_best.pt"))
            json.dump({"val": va_m, "test": te_m, "epoch": f"more{ep+1}",
                       "model": MODEL_NAME, "img": IMG,
                       "train_images": int(len(tr) + len(va)),
                       "test_images": int(len(dte))},
                      open(os.path.join(ART, "ft_metrics.json"), "w"), indent=2)
            log(f"  -> saved new best (val bal {best:.4f})")
    log(f"finetune_more best val balanced acc: {best:.4f}")


@torch.no_grad()
def evaluate(model, dl):
    model.eval()
    ps, ys = [], []
    for xb, yb in dl:
        ps.append(model(xb).argmax(1).numpy()); ys.append(yb.numpy())
    p = np.concatenate(ps); y = np.concatenate(ys)
    acc = float((p == y).mean())
    per = [float((p[y == c] == c).mean()) for c in range(len(CLASSES)) if (y == c).sum()]
    return {"acc": acc, "bal": float(np.mean(per)),
            "per_class": {CLASSES[c]: round(float((p[y == c] == c).mean()), 4)
                          for c in range(len(CLASSES)) if (y == c).sum()}}


# ------------------------------------------------------------------ export
def export():
    model = FullModel()
    model.load_state_dict(torch.load(os.path.join(ART, "ft_best.pt"),
                                     weights_only=True))
    model.eval()
    ex = torch.randn(1, 3, IMG, IMG)
    ts = torch.jit.trace(model, ex)
    ts.save(os.path.join(ART, "skin_model.pt"))
    m = json.load(open(os.path.join(ART, "ft_metrics.json")))
    m["classes"] = CLASSES
    m["img_size"] = IMG
    m["mean"] = [0.485, 0.456, 0.406]
    m["std"] = [0.229, 0.224, 0.225]
    json.dump(m, open(os.path.join(ART, "model_card.json"), "w"), indent=2)
    log(f"exported TorchScript model + card: test acc {m['test']['acc']:.4f} "
        f"bal {m['test']['bal']:.4f}")


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    {"convert": convert, "extract": extract, "head": train_head,
     "finetune": finetune, "finetune_more": finetune_more,
     "export": export}.get(cmd, lambda: log(f"unknown cmd {cmd}"))()
