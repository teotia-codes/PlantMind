from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import shutil

from rag.pdf_processor import extract_text_from_pdf
from rag.text_chunker import chunk_text

from rag.chroma_service import (
    store_chunks,
    search_chunks,
    collection
)

from rag.entity_extractor import extract_entities
from rag.graph_service import (
    save_equipment,
    driver
)

from rag.gemini_service import generate_answer

app = FastAPI()

# -----------------------------------
# CORS
# -----------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------
# Upload folder
# -----------------------------------

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# -----------------------------------
# Models
# -----------------------------------

class ChatRequest(BaseModel):
    question: str


class RCARequest(BaseModel):
    equipment: str
    symptoms: str


class ComplianceRequest(BaseModel):
    document_text: str


class LessonsRequest(BaseModel):
    query: str


# -----------------------------------
# Home
# -----------------------------------

@app.get("/")
def home():
    return {
        "message": "PlantMind Backend Running"
    }


# -----------------------------------
# Upload PDF
# -----------------------------------

@app.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(
            file.file,
            buffer
        )

    text = extract_text_from_pdf(
        file_path
    )

    chunks = chunk_text(text)

    store_chunks(
        chunks,
        file.filename
    )

    entities = extract_entities(text)

    equipment_nodes = entities.get(
        "equipment",
        []
    )

    save_equipment(
        equipment_nodes
    )

    return {
        "status": "success",
        "filename": file.filename,
        "chunks": len(chunks),
        "entities": entities
    }


# -----------------------------------
# Documents
# -----------------------------------

@app.get("/documents")
def documents():

    docs = []

    for file in os.listdir(
        UPLOAD_DIR
    ):

        path = os.path.join(
            UPLOAD_DIR,
            file
        )

        docs.append({
            "name": file,
            "size": os.path.getsize(path),
            "path": path,
            "status": "processed"
        })

    return docs


# -----------------------------------
# Chat
# -----------------------------------

@app.post("/chat")
def chat(req: ChatRequest):

    results = search_chunks(
        req.question
    )

    documents = results.get(
        "documents",
        []
    )

    metadatas = results.get(
        "metadatas",
        []
    )

    if not documents or not documents[0]:
        return {
            "answer":
            "No relevant information found in uploaded documents.",
            "sources": []
        }

    docs = documents[0]

    metadata = (
        metadatas[0]
        if metadatas
        else []
    )

    context = "\n\n".join(
        docs
    )

    answer = generate_answer(
        context,
        req.question
    )

    sources = []

    for i, doc in enumerate(docs):

        meta = (
            metadata[i]
            if i < len(metadata)
            else {}
        )

        sources.append({
            "file":
            meta.get(
                "source",
                "unknown"
            ),

            "chunk":
            meta.get(
                "chunk_index",
                -1
            ),

            "preview":
            doc[:200] + "..."
        })

    return {
        "answer": answer,
        "sources": sources
    }


# -----------------------------------
# RCA
# -----------------------------------

@app.post("/rca")
def rca(req: RCARequest):

    rag_query = (
        f"{req.equipment} "
        f"{req.symptoms} "
        f"failure maintenance"
    )

    results = search_chunks(
        rag_query
    )

    docs = (
        results["documents"][0]
        if results.get("documents")
        else []
    )

    rag_context = "\n\n".join(
        docs
    )

    prompt = f"""
Equipment:
{req.equipment}

Symptoms:
{req.symptoms}

Provide:

1. Root Cause

2. Confidence Level

3. Recommended Inspection

4. Corrective Action

5. Prevention Strategy
"""

    answer = generate_answer(
        rag_context,
        prompt
    )

    return {
        "analysis": answer
    }


# -----------------------------------
# Compliance
# -----------------------------------

@app.post("/compliance")
def compliance(
    req: ComplianceRequest
):

    results = search_chunks(
        req.document_text
    )

    docs = (
        results["documents"][0]
        if results.get("documents")
        else []
    )

    context = "\n\n".join(
        docs
    )

    prompt = f"""
Compliance Review

Document:

{req.document_text}

Identify:

1. Violations

2. Missing Records

3. Risks

4. Recommendations
"""

    answer = generate_answer(
        context,
        prompt
    )

    return {
        "analysis": answer
    }


# -----------------------------------
# Lessons Learned
# -----------------------------------

@app.post("/lessons")
def lessons(
    req: LessonsRequest
):

    results = search_chunks(
        req.query
    )

    docs = (
        results["documents"][0]
        if results.get("documents")
        else []
    )

    context = "\n\n".join(
        docs
    )

    prompt = f"""
Analyze:

{req.query}

Using the supplied context.

Provide:

1. Lessons Learned

2. Similar Failure Patterns

3. Preventive Measures

4. Future Warnings

5. Best Practices
"""

    answer = generate_answer(
        context,
        prompt
    )

    return {
        "analysis": answer
    }


# -----------------------------------
# Equipment
# -----------------------------------

@app.get("/equipment")
def equipment():

    equipment_list = []

    try:

        with driver.session() as session:

            result = session.run(
                """
                MATCH (e:Equipment)
                RETURN e.name AS name
                """
            )

            equipment_list = [
                row["name"]
                for row in result
            ]

    except Exception as e:
        print(e)

    return equipment_list


# -----------------------------------
# Graph
# -----------------------------------

@app.get("/graph")
def graph():
    return get_graph_data()


# -----------------------------------
# Stats
# -----------------------------------

@app.get("/stats")
def stats():

    try:

        doc_count = len(
            os.listdir(UPLOAD_DIR)
        )

        chunk_count = (
            collection.count()
        )

        equipment_count = 0

        with driver.session() as session:

            result = session.run(
                """
                MATCH (e:Equipment)
                RETURN count(e) AS total
                """
            )

            equipment_count = result.single()[
                "total"
            ]

        return {
            "documents":
            doc_count,

            "chunks":
            chunk_count,

            "equipment":
            equipment_count
        }

    except Exception as e:

        return {
            "error": str(e)
        }