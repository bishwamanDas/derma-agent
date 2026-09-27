"""
Helix-Derm inference API.

Serves the fine-tuned skin-lesion classifier (TorchScript, exported by
training/train.py) over a small FastAPI surface that the Next.js frontend
proxies at /api/ai/*.

Endpoints
  GET  /api/health      -> liveness + model status
  GET  /api/model-info  -> architecture, dataset and accuracy metrics
  POST /api/predict     -> multipart image upload -> top-3 predictions + guidance
"""
import io
import json
import os

# Load .env file (GEMINI_API_KEY etc.) -- best-effort, no hard dependency
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv not installed; user must export env vars manually
import time

import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps

from diseases import DISEASES, SEVERITY_META

BASE = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE, "models", "skin_model.pt")
CARD_PATH = os.path.join(BASE, "models", "model_card.json")

CLASSES = ["AK", "BCC", "BKL", "DF", "MEL", "NV", "SCC", "VASC"]
IMG_SIZE = 128
MEAN = np.array([0.485, 0.456, 0.406], dtype=np.float32)
STD = np.array([0.229, 0.224, 0.225], dtype=np.float32)
MAX_BYTES = 12 * 1024 * 1024

torch.set_num_threads(2)

model = None
model_card = {}
if os.path.exists(MODEL_PATH):
    model = torch.jit.load(MODEL_PATH, map_location="cpu")
    model.eval()
if os.path.exists(CARD_PATH):
    with open(CARD_PATH) as f:
        model_card = json.load(f)

app = FastAPI(title="DermaAgent Inference API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "model_loaded": model is not None}


@app.get("/api/model-info")
def model_info():
    return {
        "loaded": model is not None,
        "architecture": "MobileNetV3-Large (ImageNet-pretrained, fine-tuned)",
        "input_size": IMG_SIZE,
        "classes": [{"code": c, **{k: v for k, v in DISEASES[c].items()
                                   if k in ("name", "severity")}} for c in CLASSES],
        "metrics": {
            "test_accuracy": model_card.get("test", {}).get("acc"),
            "test_balanced_accuracy": model_card.get("test", {}).get("bal"),
            "val_balanced_accuracy": model_card.get("val", {}).get("bal"),
            "per_class_recall": model_card.get("test", {}).get("per_class"),
        },
        "dataset": {
            "name": "ISIC 2019 (International Skin Imaging Collaboration)",
            "train_images": model_card.get("train_images", 20262),
            "test_images": model_card.get("test_images", 5069),
        },
    }


def preprocess(raw: bytes) -> torch.Tensor:
    try:
        img = Image.open(io.BytesIO(raw))
    except Exception:
        raise HTTPException(400, "Could not decode the uploaded file as an image.")
    img = ImageOps.exif_transpose(img)  # respect phone orientation
    img = img.convert("RGB")
    img = img.resize((IMG_SIZE, IMG_SIZE), Image.Resampling.LANCZOS)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = (arr - MEAN) / STD
    t = torch.from_numpy(arr).permute(2, 0, 1).unsqueeze(0)
    return t


def classify(raw: bytes) -> dict:
    """Run the classifier over raw image bytes and return the full result dict.

    Shared by POST /api/predict and the agentic pipeline, which calls this as
    its `analyze_image` tool, so both paths report identical numbers.
    """
    if model is None:
        raise HTTPException(503, "Model not loaded. Run training/train.py first.")
    x = preprocess(raw)
    t0 = time.perf_counter()
    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1)[0].numpy()
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    order = np.argsort(probs)[::-1][:3]
    preds = []
    for i in order:
        code = CLASSES[int(i)]
        preds.append({
            "code": code,
            "name": DISEASES[code]["name"],
            "probability": round(float(probs[i]), 4),
        })

    top = preds[0]
    meta = DISEASES[top["code"]]
    sev = SEVERITY_META[meta["severity"]]
    return {
        "predictions": preds,
        "top": {
            **top,
            "severity": meta["severity"],
            "severity_label": sev["label"],
            "severity_color": sev["color"],
            "severity_advice": sev["advice"],
            "description": meta["description"],
            "tips": meta["tips"],
        },
        "inference_ms": elapsed_ms,
        "model": {
            "architecture": "MobileNetV3-Large",
            "input_size": IMG_SIZE,
            "test_accuracy": model_card.get("test", {}).get("acc"),
        },
    }


@app.post("/api/predict")
async def predict(file: UploadFile = File(...)):
    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Empty upload.")
    if len(raw) > MAX_BYTES:
        raise HTTPException(413, "Image too large (max 12 MB).")
    return classify(raw)


# ---------------------------------------------------------------------------
# DermaAgent — agentic triage (see backend/agent/ and docs/AGENT.md)
# ---------------------------------------------------------------------------
from fastapi import Form
from fastapi.responses import StreamingResponse

from agent.core import Orchestrator
from agent.memory import MemoryStore
from agent.llm_chat import is_llm_available

agent_store = MemoryStore(ttl_seconds=3600)
orchestrator = Orchestrator()


@app.get("/api/agent/info")
def agent_info():
    return {
        "system": "DermaAgent",
        "planner_backend": orchestrator.backend_name,
        "llm_followup": "active" if is_llm_available() else "inactive (set GEMINI_API_KEY)",
        "planner_backends_supported": [
            "policy-engine (built-in deterministic planner, default)",
            "llm:<model> (any OpenAI-compatible API via DERM_AGENT_API_KEY)",
            "gemini-followup (free Gemini 2.0 Flash for conversational Q&A via GEMINI_API_KEY)",
        ],
        "agents": [
            {"name": "triage-agent", "role": "gathers evidence with tools"},
            {"name": "care-advisor", "role": "writes the care plan and urgency"},
            {"name": "llm-followup", "role": "LLM-powered conversational Q&A after report"},
            {"name": "orchestrator", "role": "supervisor: routes and supervises the run"},
        ],
        "tools": orchestrator.registry.schemas(),
        "loop": "ReAct: Thought -> Action (tool) -> Observation, max 12 steps/run",
    }


@app.post("/api/agent/session")
def agent_session():
    mem = agent_store.create()
    return {"session_id": mem.session_id}


@app.post("/api/agent/chat")
async def agent_chat(
    message: str = Form(""),
    session_id: str = Form(""),
    image: UploadFile | None = File(None),
):
    mem = agent_store.get(session_id)
    if mem is None:
        mem = agent_store.create()

    image_bytes = None
    if image is not None:
        image_bytes = await image.read()
        if len(image_bytes) > MAX_BYTES:
            raise HTTPException(413, "Image too large (max 12 MB).")
        if not image_bytes:
            image_bytes = None

    def event_stream():
        # first event tells the client which session this run belongs to
        yield f"data: {json.dumps({'type': 'session', 'session_id': mem.session_id})}\n\n"
        try:
            for ev in orchestrator.run(mem, message, image_bytes):
                yield f"data: {json.dumps(ev, default=str)}\n\n"
        except Exception as exc:  # never leave the client hanging
            yield f"data: {json.dumps({'type': 'error', 'message': str(exc)})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'finished': False})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
