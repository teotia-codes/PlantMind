import React, { useState, useEffect } from "react";
import { api, type DocumentInfo } from "../services/api";
import { Upload, FileText, CheckCircle2, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { toast, Toaster } from "sonner";
import "./Documents.css";

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [stats, setStats] = useState<{ chunks: number; entities: string[] } | null>(
    null
  );

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load documents.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDocument = async (filename: string) => {
    if (!window.confirm(`Delete "${filename}" and remove all its vector chunks?`)) return;
    try {
      const result = await api.deleteDocument(filename);
      toast.success(`Deleted "${filename}" — ${result.chunks_removed} chunks removed from knowledge base.`);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      toast.error(`Failed to delete "${filename}".`);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    const allowedExtensions = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".bmp",
  ".tiff",
  ".tif",
];

const extension =
  "." +
  file.name
    .split(".")
    .pop()
    ?.toLowerCase();

if (!allowedExtensions.includes(extension)) {

  toast.error(
    "Supported formats: PDF, PNG, JPG, JPEG, BMP and TIFF."
  );

  return;

}

    setUploadStatus("uploading");
    setStats(null);
    toast.info(`Uploading ${file.name}...`);

    try {
      const res = await api.uploadDocument(file);
      setUploadStatus("success");
      setStats({
        chunks: res.chunks,
        entities: res.entities ? Object.values(res.entities).flat() : [],
      });
      toast.success(`${file.name} successfully ingested!`);
      fetchDocuments();
    } catch (err) {
      console.error(err);
      setUploadStatus("error");
      toast.error("Failed to ingest PDF document. Verify backend status.");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="page-container documents-page">
      <Toaster position="top-right" richColors />
      <div className="documents-layout">
        {/* Left Panel: Ingest Widget */}
        <div className="glass-card upload-section">
          <h3>Ingest Industrial Documents</h3>
          <p className="section-desc">
            Upload safety manuals, standard operating procedures (SOPs), piping diagrams, or telemetry logs.
          </p>

          <form
            className={`dropzone ${dragActive ? "drag-active" : ""}`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.png,.jpg,.jpeg,.bmp,.tiff,.tif"
              onChange={handleFileInput}
              hidden
            />
            <label htmlFor="file-upload" className="dropzone-label">
              <div className="upload-icon-wrap">
                <Upload size={32} />
              </div>
              <p className="main-prompt">

Drag & drop your

<strong>PDF or Image</strong>

here, or

<span className="browse-link">

browse files

</span>

</p>
              <p className="format-hint">

Supports

PDF,

PNG,

JPG,

JPEG,

BMP,

TIFF

(up to 50MB)

</p>
            </label>
          </form>

          {/* Upload Status Card */}
          {uploadStatus !== "idle" && (
            <div className={`upload-status-card ${uploadStatus}`}>
              {uploadStatus === "uploading" && (
                <div className="status-flex">
                  <div className="spinner"></div>
                  <div>
                    <h4>

Processing Document...

</h4>

<p>

Extracting text (OCR if needed),

creating embeddings,

building the Knowledge Graph

and storing vectors.

</p>
                  </div>
                </div>
              )}

              {uploadStatus === "success" && (
                <div className="status-flex">
                  <CheckCircle2 className="success-icon" size={32} />
                  <div>
                    <h4>Ingestion Complete!</h4>
                    <p>
                      Successfully stored <strong>{stats?.chunks}</strong> vector chunks inside vector storage.
                    </p>
                    {stats?.entities && stats.entities.length > 0 && (
                      <div className="entity-tags">
                        <strong>Entities Ingested:</strong>
                        <div className="tags-container">
                          {stats.entities.map((ent, idx) => (
                            <span key={idx} className="entity-tag">
                              {ent}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="status-flex">
                  <AlertCircle className="error-icon" size={32} />
                  <div>
                    <h4>Ingestion Failed</h4>
                    <p>An error occurred. Check if FastAPI and Gemini services are online.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Document List */}
        <div className="glass-card document-list-section">
          <div className="section-header">
            <h3>Ingested PDF Files</h3>
            <button className="icon-btn" onClick={fetchDocuments} title="Refresh Table">
              <RefreshCw size={18} />
            </button>
          </div>

          {loading ? (
            <div className="table-loader">
              <div className="spinner"></div>
              <span>Reading vector database index...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="empty-state">
              <FileText size={48} className="empty-icon" />
              <h4>No documents uploaded yet</h4>
              <p>Upload standard operating procedures or safety PDFs on the left to start indexing.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Filename</th>
                    <th>Size</th>
                    <th>Storage Index</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc, index) => (
                    <tr key={index}>
                      <td className="file-name-cell">
                        <FileText size={16} className="table-file-icon" />
                        <span title={doc.name}>{doc.name}</span>
                      </td>
                      <td>{formatBytes(doc.size)}</td>
                      <td>
                        <code className="index-code">ChromaDB</code>
                      </td>
                      <td>
                        <span className="status-pill status-processed">Active RAG</span>
                      </td>
                      <td>
                        <button
                          className="delete-doc-btn"
                          onClick={() => handleDeleteDocument(doc.name)}
                          title="Delete document"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
