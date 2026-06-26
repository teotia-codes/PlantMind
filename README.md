# PlantMind AI — Industrial Knowledge Intelligence Platform

> AI-powered platform that ingests heterogeneous industrial documents and makes their collective intelligence queryable, actionable, and continuously updated at the point of need.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  React + Vite Frontend  (port 5173)                             │
│  Dashboard · Documents · Copilot · RCA · Compliance · Lessons   │
│  Knowledge Graph · Sidebar · Navbar                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP (axios)
┌─────────────────────────▼───────────────────────────────────────┐
│  FastAPI Backend  (port 8000)                                   │
│  /upload  /chat  /rca  /compliance  /lessons  /graph  /stats   │
└────┬─────────────┬──────────────┬────────────────┬─────────────┘
     │             │              │                │
 pypdf +       ChromaDB        Gemini          Neo4j (optional)
 sentence-    (vector store)  2.5 Flash       + JSON sidecar
 transformers  MiniLM embeds   (LLM)           (fallback graph)
```

---

## Quick Start

### 1. Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set your Gemini API key
cp .env.example .env
# Edit .env and add:  GEMINI_API_KEY=your_key_here

# (Optional) Neo4j credentials — leave defaults if not using Neo4j
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASS=password

# Start the server
uvicorn main:app --reload --port 8000
```

> **Neo4j is optional.** If not running, the knowledge graph falls back to a local JSON sidecar file (`graph_data.json`) that is auto-populated on every document upload, then to a hardcoded demo graph.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

---

## Environment Variables

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here

# Optional — only needed if running Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASS=your_neo4j_password
```

---

## Features

| Module | Description |
|---|---|
| **Document Ingestion** | Upload PDFs → sentence-aware chunking → MiniLM embeddings → ChromaDB vector store |
| **Entity Extraction** | Regex NER for equipment tags, pressures, temperatures, flow rates, regulatory standards, incident IDs |
| **Expert Copilot** | RAG-powered Q&A with source citations and per-source confidence scores |
| **RCA Analyzer** | Structured root-cause analysis grounded in your knowledge base |
| **Compliance Audit** | SOP / procedure review against regulatory cross-references |
| **Lessons Learned** | Failure pattern mining with proactive warnings |
| **Knowledge Graph** | Equipment relationship visualisation (Neo4j / local sidecar / demo fallback) |
| **Dashboard** | Live stats from `/stats` endpoint — document count, chunk count, equipment nodes |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET  | `/` | Health check |
| POST | `/upload` | Ingest PDF |
| GET  | `/documents` | List ingested files |
| DELETE | `/documents/{filename}` | Remove file + purge vector chunks |
| POST | `/chat` | RAG Q&A (supports `source_filter`) |
| POST | `/rca` | Root Cause Analysis |
| POST | `/compliance` | Compliance audit |
| POST | `/lessons` | Lessons Learned report |
| GET  | `/graph` | Equipment relationship graph |
| GET  | `/equipment` | Equipment tag list |
| GET  | `/stats` | System statistics |

---

## Tech Stack

**Backend:** FastAPI · ChromaDB · sentence-transformers (MiniLM-L6-v2) · Google Gemini 2.5 Flash · pypdf · Neo4j · python-dotenv

**Frontend:** React 19 · TypeScript · Vite · React Router · Recharts · ReactFlow · Lucide React · Sonner · Axios

---

## Project Structure

```
PlantMind/
├── backend/
│   ├── main.py                  # FastAPI app + all endpoints
│   ├── requirements.txt
│   ├── .env.example
│   └── rag/
│       ├── pdf_processor.py     # pypdf text extraction
│       ├── text_chunker.py      # sentence-aware chunker with overlap
│       ├── chroma_service.py    # ChromaDB store/search/delete + cosine metric
│       ├── entity_extractor.py  # Regex NER — 7 entity categories
│       ├── gemini_service.py    # Gemini 2.5 Flash wrapper
│       └── graph_service.py     # Neo4j + JSON sidecar + demo fallback
└── frontend/
    └── src/
        ├── pages/               # Dashboard · Documents · Copilot · RCA
        │                        # Compliance · KnowledgeGraph · Lessons
        ├── components/          # Sidebar · Navbar
        └── services/api.ts      # Typed Axios client
```
