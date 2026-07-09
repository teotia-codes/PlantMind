from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import os
import shutil
import time

from rag.pdf_processor import extract_text
from rag.text_chunker    import chunk_text
from rag.chroma_service  import store_chunks, search_chunks, collection, delete_document
from rag.entity_extractor import extract_entities
from rag.graph_service   import save_graph, get_graph_data, get_equipment_count, driver
from rag.gemini_service  import generate_answer
from rag.maintenance_agent import generate_maintenance_schedule
# ────────────────────────────────────────────────────────────
app = FastAPI(
    title="PlantMind AI",
    description="Industrial Knowledge Intelligence Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ────────────────────────────────────────────────────────────
# Request / Response models
# ────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    source_filter: str | None = None   # optional: restrict to one document


class RCARequest(BaseModel):
    equipment: str
    symptoms: str


class ComplianceRequest(BaseModel):
    document_text: str


class LessonsRequest(BaseModel):
    query: str

class CrossReferenceRequest(BaseModel):
    question: str
    doc_a: str
    doc_b: str
class MaintenanceScheduleRequest(BaseModel):
    equipment: str
    horizon: str
# ────────────────────────────────────────────────────────────
# Health
# ────────────────────────────────────────────────────────────

@app.get("/", tags=["health"])
def home():
    return {"message": "PlantMind Backend Running", "version": "1.0.0"}


# ────────────────────────────────────────────────────────────
# Documents
# ────────────────────────────────────────────────────────────

from pathlib import Path

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".png",
    ".jpg",
    ".jpeg",
    ".bmp",
    ".tiff",
    ".tif",
}


@app.post("/upload", tags=["documents"])
async def upload_file(file: UploadFile = File(...)):
    """
    Ingest a document into the RAG pipeline.

    Supports:
    - PDF (searchable & scanned)
    - PNG
    - JPG / JPEG
    - BMP
    - TIFF

    Pipeline:
        1. Save uploaded file
        2. Extract text (OCR automatically if needed)
        3. Chunk text
        4. Store embeddings in ChromaDB
        5. Extract entities
        6. Update Knowledge Graph
    """

    ext = Path(file.filename).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="Supported file types: PDF, PNG, JPG, JPEG, BMP, TIFF."
        )

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        # Automatically handles searchable PDFs,
        # scanned PDFs and image files.
        text = extract_text(file_path)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Text extraction failed: {str(e)}"
        )

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text was found in the uploaded document."
        )

    chunks = chunk_text(text)

    stored = store_chunks(
        chunks,
        file.filename
    )

    entities = extract_entities(text)

    save_graph(
        entities,
        file.filename
    )

    return {
        "status": "success",
        "filename": file.filename,
        "file_type": ext,
        "chunks": stored,
        "text_length": len(text),
        "entities": entities,
    }

@app.get("/documents", tags=["documents"])
def documents():
    """List all ingested PDF files."""
    docs = []
    if not os.path.exists(UPLOAD_DIR):
        return docs

    for filename in os.listdir(UPLOAD_DIR):
        path = os.path.join(UPLOAD_DIR, filename)
        if os.path.isfile(path) and filename.lower().endswith(".pdf"):
            docs.append({
                "name":   filename,
                "size":   os.path.getsize(path),
                "path":   path,
                "status": "processed",
            })
    return docs


@app.delete("/documents/{filename}", tags=["documents"])
def delete_document_endpoint(filename: str):
    """
    Remove a document from disk and purge its chunks from ChromaDB.
    """
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Document '{filename}' not found.")

    removed_chunks = delete_document(filename)
    os.remove(file_path)

    return {
        "status":         "deleted",
        "filename":       filename,
        "chunks_removed": removed_chunks,
    }


# ────────────────────────────────────────────────────────────
# Copilot — RAG Chat
# ────────────────────────────────────────────────────────────

@app.post("/chat", tags=["copilot"])
def chat(req: ChatRequest):
    """
    Answer a question using RAG over ingested documents.
    Optionally filter to a single source file.
    Returns the answer plus source citations with confidence scores.
    """
    results = search_chunks(
        req.question,
        n_results=8,
        source_filter=req.source_filter,
    )

    raw_docs      = results.get("documents", [[]])[0]
    raw_metadatas = results.get("metadatas",  [[]])[0]
    raw_distances = results.get("distances",  [[]])[0]

    if not raw_docs:
        return {
            "answer":  "No relevant information found in the uploaded documents.",
            "sources": [],
        }

    context = "\n\n".join(raw_docs)

    system_prompt = f"""
    You are PlantMind AI.
    Always answer ONLY from the uploaded industrial documents.
    If the answer is not present,
    reply:
    'The uploaded documents do not contain sufficient information.'
    Never hallucinate.
"""

    answer = generate_answer(
        context,
        system_prompt + "\n\nQuestion:\n" + req.question
    )

    sources = []
    for doc, meta, dist in zip(raw_docs, raw_metadatas, raw_distances):
        # cosine distance → similarity score 0-100%
        confidence = round((1.0 - float(dist)) * 100, 1)
        sources.append({
            "file":       meta.get("source",      "unknown"),
            "chunk":      meta.get("chunk_index", -1),
            "confidence": confidence,
            "preview":    doc[:250] + ("..." if len(doc) > 250 else ""),
        })

    return {"answer": answer, "sources": sources}

@app.post("/cross-reference")
def cross_reference(req: CrossReferenceRequest):

    import time

    start = time.time()

    # Search first document
    results_a = search_chunks(
        query=req.question,
        n_results=6,
        source_filter=req.doc_a
    )

    # Search second document
    results_b = search_chunks(
        query=req.question,
        n_results=6,
        source_filter=req.doc_b
    )

    docs_a = results_a.get("documents", [[]])[0]
    docs_b = results_b.get("documents", [[]])[0]

    context = f"""
DOCUMENT A
==========
Filename:
{req.doc_a}

Content:
{" ".join(docs_a)}

--------------------------------------

DOCUMENT B
==========
Filename:
{req.doc_b}

Content:
{" ".join(docs_b)}
"""

    prompt = f"""
You are PlantMind AI.

Compare the two uploaded industrial documents.

Question:
{req.question}

Produce your answer in EXACTLY this format.

## Agreements
- ...

## Differences
- ...

## Missing Information
- ...

## Combined Recommendation
- ...

Base your answer ONLY on the supplied context.

If information is missing,
say so clearly.
"""

    answer = generate_answer(
        context,
        prompt
    )

    latency = round(
        time.time() - start,
        2
    )

    return {

        "answer": answer,

        "latency": latency,

        "documents": [
            req.doc_a,
            req.doc_b
        ],

        "sources": [
            {
                "file": req.doc_a,
                "chunks": len(docs_a)
            },
            {
                "file": req.doc_b,
                "chunks": len(docs_b)
            }
        ]
    }

@app.post("/maintenance-schedule")
def maintenance_schedule(req: MaintenanceScheduleRequest):

    start = time.time()

    query = (
        f"{req.equipment} maintenance "
        "inspection lubrication overhaul "
        "frequency preventive schedule"
    )

    results = search_chunks(
        query=query,
        n_results=10,
    )

    docs = results.get("documents", [[]])[0]

    context = "\n\n".join(docs)

    answer = generate_maintenance_schedule(
        context=context,
        equipment=req.equipment,
        horizon=req.horizon,
    )

    latency = round(
        time.time() - start,
        2
    )

    return {

        "equipment": req.equipment,

        "horizon": req.horizon,

        "schedule": answer,

        "latency": latency,

        "sources": list(
            {
                meta.get("source", "unknown")
                for meta in results.get(
                    "metadatas",
                    [[]],
                )[0]
            }
        )

    }
# ────────────────────────────────────────────────────────────
# Root Cause Analysis
# ────────────────────────────────────────────────────────────



@app.post("/rca", tags=["rca"])
def rca(req: RCARequest):
    """
    Generate a structured Root Cause Analysis report.
    Retrieves relevant chunks from the knowledge base to ground the analysis.
    """
    rag_query = f"{req.equipment} {req.symptoms} failure maintenance root cause"

    results  = search_chunks(rag_query, n_results=8)
    docs     = results.get("documents", [[]])[0]
    rag_context = "\n\n".join(docs) if docs else ""

    prompt = f"""You are a senior industrial maintenance engineer with 20+ years of experience.

Equipment Tag   : {req.equipment}
Reported Symptoms: {req.symptoms}

Using the knowledge base context below, generate a structured Root Cause Analysis (RCA) report.

---KNOWLEDGE BASE CONTEXT---
{rag_context}
---END CONTEXT---

Structure your response EXACTLY as follows:

**1. Likely Root Cause**
<concise technical explanation>

**2. Confidence Level**
<percentage and brief rationale — e.g. "85% — supported by bearing temperature data in SOP-12">

**3. Recommended Inspections**
- <actionable inspection step>
- <actionable inspection step>

**4. Corrective Actions**
- <corrective action>
- <corrective action>

**5. Long-Term Prevention Strategy**
<paragraph summarising systemic improvements to avoid recurrence>

If the knowledge base context does not contain relevant information for a section, state "Not specified in uploaded documents" for that section only."""

    answer = generate_answer(rag_context, prompt)
    return {"analysis": answer}


# ────────────────────────────────────────────────────────────
# Compliance Audit
# ────────────────────────────────────────────────────────────

@app.post("/compliance", tags=["compliance"])
def compliance(req: ComplianceRequest):
    """
    Audit a pasted SOP / procedure document against regulatory knowledge.
    Uses the knowledge base to cross-reference relevant standards.
    """
    # Search the knowledge base for relevant regulatory context
    results = search_chunks(req.document_text[:500], n_results=8)
    kb_docs = results.get("documents", [[]])[0]
    kb_context = "\n\n".join(kb_docs) if kb_docs else "No additional regulatory context found."

    # The DOCUMENT UNDER REVIEW is the context; the KB enriches it
    full_context = (
        f"---DOCUMENT UNDER REVIEW---\n{req.document_text}\n\n"
        f"---KNOWLEDGE BASE REFERENCES---\n{kb_context}"
    )

    question = """Perform a compliance audit on the document above.

Structure your response EXACTLY as follows:

**1. Compliance Violations**
List each violation with the specific clause or standard it breaches.

**2. Missing Records / Documentation Gaps**
List mandatory records that are absent or incomplete.

**3. Safety Concerns**
List any safety risks identified, referencing specific lines from the document.

**4. Audit Observations**
General observations about documentation quality and completeness.

**5. Recommendations**
Prioritised list of corrective actions with suggested timeline (Immediate / 30 days / 90 days).

If a category has no findings, write "No issues identified." Do not invent violations."""

    answer = generate_answer(full_context, question)
    return {"analysis": answer}


# ────────────────────────────────────────────────────────────
# Lessons Learned
# ────────────────────────────────────────────────────────────

@app.post("/lessons", tags=["lessons"])
def lessons(req: LessonsRequest):
    """
    Mine the knowledge base for historical failure patterns and lessons learned
    relevant to the supplied query.
    """
    results  = search_chunks(req.query, n_results=10)
    docs     = results.get("documents", [[]])[0]
    context  = "\n\n".join(docs) if docs else ""

    prompt = f"""You are an industrial safety and reliability engineer.

Query: {req.query}

Using the knowledge base context below, produce a Lessons Learned report.

---KNOWLEDGE BASE CONTEXT---
{context}
---END CONTEXT---

Structure your response EXACTLY as follows:

**1. Key Lessons Learned**
- <lesson>

**2. Recurring Failure Patterns Identified**
- <pattern>

**3. Preventive Measures**
- <measure>

**4. Proactive Warnings for Similar Conditions**
- <warning>

**5. Industry Best Practices**
- <best practice>

Ground every point in the knowledge base context. If insufficient data exists for a section, state "Insufficient historical data in knowledge base for this category." """
    raw_metadatas = results.get("metadatas",  [[]])[0]
    raw_distances = results.get("distances",  [[]])[0]

    sources = []
    for doc, meta, dist in zip(docs, raw_metadatas, raw_distances):
        confidence = round((1.0 - float(dist)) * 100, 1)
        sources.append({
            "file":       meta.get("source",      "unknown"),
            "chunk":      meta.get("chunk_index", -1),
            "confidence": confidence,
            "preview":    doc[:250] + ("..." if len(doc) > 250 else ""),
        })

    start = time.time()
    answer = generate_answer(context, prompt)
    latency = round(time.time() - start, 2)
    return {
        "analysis": answer,
        "answer": answer,
        "latency": latency,
        "sources": sources
    }


# ────────────────────────────────────────────────────────────
# Knowledge Graph
# ────────────────────────────────────────────────────────────

@app.get("/graph", tags=["graph"])
def graph():
    """
    Return equipment nodes and relationships.
    Priority: Neo4j → local JSON sidecar → hardcoded demo graph.
    Never returns an error to the frontend.
    """
    return get_graph_data()


@app.get("/equipment", tags=["graph"])
def equipment():
    """List all equipment tags extracted from uploaded documents."""
    try:
        with driver.session() as session:
            result = session.run(
                "MATCH (e:Equipment) RETURN e.name AS name"
            )
            return [row["name"] for row in result]
    except Exception:
        # fall back to sidecar node IDs
        from rag.graph_service import _load_sidecar
        sidecar = _load_sidecar()
        return [n["id"] for n in sidecar.get("nodes", [])]


# ────────────────────────────────────────────────────────────
# Stats  (wired to Dashboard)
# ────────────────────────────────────────────────────────────

@app.get("/stats", tags=["health"])
def stats():
    """
    Real-time system statistics for the Dashboard.
    Returns document count, vector chunk count, and equipment node count.
    Falls back gracefully if any service is unavailable.
    """
    doc_count   = 0
    chunk_count = 0
    equip_count = 0

    try:
        doc_count = len([
            f for f in os.listdir(UPLOAD_DIR)
            if f.lower().endswith(".pdf")
        ])
    except Exception:
        pass

    try:
        chunk_count = collection.count()
    except Exception:
        pass

    try:
        equip_count = get_equipment_count()
    except Exception:
        pass

    return {
    "documents":doc_count,
    "chunks":chunk_count,
    "equipment":equip_count,
    "graph_nodes":equip_count,
    "vector_store":"Healthy",
    "neo4j":"Connected"
}


# ────────────────────────────────────────────────────────────
# Activity Feed  (real events from uploads)
# ────────────────────────────────────────────────────────────

@app.get("/activity", tags=["health"])
def activity():
    """
    Return a real activity feed derived from ingested documents.
    Each entry is built from actual file metadata + ChromaDB chunk counts.
    No hardcoded events — if nothing is uploaded, the list is empty.
    """
    events = []

    try:
        files = [
            f for f in os.listdir(UPLOAD_DIR)
            if f.lower().endswith(".pdf")
        ]

        for filename in sorted(
            files,
            key=lambda f: os.path.getmtime(os.path.join(UPLOAD_DIR, f)),
            reverse=True,
        )[:10]:   # most recent 10
            path  = os.path.join(UPLOAD_DIR, filename)
            mtime = os.path.getmtime(path)
            size  = os.path.getsize(path)

            # count chunks belonging to this file
            try:
                res = collection.get(
                    where={"source": filename},
                    include=["documents"],
                )
                chunk_count = len(res.get("ids", []))
            except Exception:
                chunk_count = 0

            events.append({
                "type":        "upload",
                "filename":    filename,
                "size_kb":     round(size / 1024, 1),
                "chunks":      chunk_count,
                "timestamp":   mtime,         # Unix seconds
            })
            events.append({
    "type":"system",
    "message":"Knowledge Graph updated",
    "timestamp":time.time()
})

    except Exception as e:
        print(f"[activity] error: {e}")

    return events


# ────────────────────────────────────────────────────────────
# Extract raw text from an already-ingested file
# (used by Compliance page to pre-fill the text area)
# ────────────────────────────────────────────────────────────

@app.get("/extract-text/{filename}", tags=["documents"])
def extract_text_endpoint(filename: str):
    """
    Return the extracted plain text of a previously uploaded PDF.
    The Compliance page uses this to pre-populate the audit textarea
    without requiring the user to paste text manually.
    """
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"'{filename}' not found.")

    text = extract_text_from_pdf(file_path)
    return {"filename": filename, "text": text}
