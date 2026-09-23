import pyarrow.parquet as pq
from PIL import Image
import io
import collections

for split in ["train", "test"]:
    pf = pq.ParquetFile(f"data/{split}.parquet")
    n = pf.metadata.num_rows
    print(f"{split}: {n} rows, cols={pf.schema_arrow.names}")
    # label distribution + sample image
    lab = collections.Counter()
    for batch in pf.iter_batches(batch_size=2048, columns=["label"]):
        lab.update(batch.column("label").to_pylist())
    print("  labels:", dict(sorted(lab.items())))
    first = next(pf.iter_batches(batch_size=1))
    img_bytes = first.column("image")[0].as_py()
    im = Image.open(io.BytesIO(img_bytes))
    print("  sample image:", im.format, im.size, im.mode, len(img_bytes), "bytes")
