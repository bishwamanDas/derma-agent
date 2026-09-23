import pyarrow.parquet as pq
pf = pq.ParquetFile("data/train.parquet")
b = next(pf.iter_batches(batch_size=2))
v = b.column("image")[0].as_py()
print("type:", type(v), "len:", len(v))
print("first 64 bytes hex:", v[:64].hex())
print("repr head:", repr(v[:40]))
