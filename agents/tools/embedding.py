# embedding.py — Ofox embedding function shared by build_index.py and knowledge_loader.py
# 避免循环依赖，两边都从这一个文件 import

import httpx
import os
from dotenv import load_dotenv
from chromadb.utils import embedding_functions

load_dotenv()

EMBEDDING_BASE_URL = os.environ.get("EMBEDDING_BASE_URL", "https://api.openai.com/v1")


class OfoxEmbeddingFunction(embedding_functions.EmbeddingFunction):
    """OpenAI-compatible text-embedding-3-small (1536 dims)."""

    def __init__(self):
        super().__init__()

    def __call__(self, input: list[str]) -> list[list[float]]:
        api_key = os.environ.get("OPENAI_API_KEY", "")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY environment variable not set")
        all_embeddings = []
        batch_size = 50
        for i in range(0, len(input), batch_size):
            batch = input[i:i + batch_size]
            resp = httpx.post(
                f"{EMBEDDING_BASE_URL}/embeddings",
                headers={"Authorization": f"Bearer {api_key}"},
                json={"model": "text-embedding-3-small", "input": batch},
                timeout=30,
            )
            if resp.status_code != 200:
                raise RuntimeError(f"Embedding API error: {resp.status_code} {resp.text}")
            data = resp.json()
            all_embeddings.extend([d["embedding"] for d in data["data"]])
        return all_embeddings
