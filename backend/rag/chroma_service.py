import uuid
import chromadb
from sentence_transformers import SentenceTransformer

client = chromadb.PersistentClient(path="chroma_db")

collection = client.get_or_create_collection(
    name="industrial_docs"
)

model = SentenceTransformer(
    "all-MiniLM-L6-v2"
)

def store_chunks(chunks, source_filename=""):

    embeddings = model.encode(chunks).tolist()

    ids = [
        f"{source_filename}_{uuid.uuid4().hex[:8]}"
        for _ in chunks
    ]

    metadatas = [
        {
            "source": source_filename,
            "chunk_index": i
        }
        for i in range(len(chunks))
    ]

    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=ids,
        metadatas=metadatas
    )

def search_chunks(query):

    query_embedding = model.encode(
        [query]
    ).tolist()[0]

    result = collection.query(
        query_embeddings=[query_embedding],
        n_results=5
    )

    return result


