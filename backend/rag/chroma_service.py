import uuid
import chromadb
from sentence_transformers import SentenceTransformer

client = chromadb.PersistentClient(path="chroma_db")

collection = client.get_or_create_collection(
    name="industrial_docs",
    metadata={"hnsw:space": "cosine"},   # cosine distance → scores map 0-1
)

model = SentenceTransformer("all-MiniLM-L6-v2")


def store_chunks(chunks: list[str], source_filename: str = "") -> int:
    """
    Embed and store text chunks with source metadata.
    Returns the number of chunks stored.
    """
    if not chunks:
        return 0

    embeddings = model.encode(chunks, show_progress_bar=False).tolist()

    ids = [
        f"{source_filename}_{uuid.uuid4().hex[:8]}"
        for _ in chunks
    ]

    metadatas = [
        {
            "source":      source_filename,
            "chunk_index": i,
        }
        for i in range(len(chunks))
    ]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas,
    )

    return len(chunks)


def search_chunks(query: str, n_results: int = 5, source_filter: str | None = None) -> dict:
    """
    Semantic search over the collection.

    Args:
        query:         Natural-language question.
        n_results:     How many chunks to return.
        source_filter: If set, restrict results to this filename.

    Returns:
        ChromaDB result dict with keys:
            documents, metadatas, distances, ids
    """
    query_embedding = model.encode([query], show_progress_bar=False).tolist()[0]

    kwargs: dict = {
        "query_embeddings": [query_embedding],
        "n_results":        n_results,
        "include":          ["documents", "metadatas", "distances"],
    }

    if source_filter:
        kwargs["where"] = {"source": source_filter}

    # Guard: ChromaDB raises if n_results > collection size
    count = collection.count()
    if count == 0:
        return {"documents": [[]], "metadatas": [[]], "distances": [[]]}

    kwargs["n_results"] = min(n_results, count)

    return collection.query(**kwargs)


def delete_document(source_filename: str) -> int:
    """
    Remove all chunks that belong to a given source file.
    Returns the number of chunks removed.
    """
    results = collection.get(
        where={"source": source_filename},
        include=["documents"],
    )
    ids = results.get("ids", [])
    if ids:
        collection.delete(ids=ids)
    return len(ids)
