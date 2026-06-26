import { useState, useEffect } from "react";
import { api, type DocumentInfo } from "../services/api";
import {
  ShieldCheck, ShieldAlert, FileText,
  ClipboardCheck, AlertOctagon, HelpCircle, Loader2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import "./Compliance.css";

// ── Markdown-aware audit report renderer ─────────────────────────────────────
function formatAuditText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="spacer-line" />;

    // Section headers  **1. Compliance Violations**
    if (/^\*\*\d+\./.test(trimmed)) {
      const label = trimmed.replace(/\*\*/g, "").trim();
      const lower = label.toLowerCase();

      let Icon = ClipboardCheck;
      let cls = "audit-item-row";

      if (lower.includes("violation"))  { Icon = AlertOctagon;  cls += " error-item"; }
      else if (lower.includes("missing") || lower.includes("gap")) { Icon = AlertOctagon; cls += " error-item"; }
      else if (lower.includes("safety") || lower.includes("risk"))  { Icon = ShieldAlert; cls += " warn-item"; }
      else if (lower.includes("observation"))                        { Icon = HelpCircle;  cls += " observation-item"; }
      else if (lower.includes("recommend"))                          { Icon = ShieldCheck; cls += " ok-item"; }

      return (
        <div key={index} className={`audit-section-header ${cls}`}>
          <Icon size={16} className="audit-li-icon" />
          <h4>{label}</h4>
        </div>
      );
    }

    if (trimmed.startsWith("### ")) return <h4 key={index} className="audit-h4">{trimmed.slice(4)}</h4>;
    if (trimmed.startsWith("## "))  return <h3 key={index} className="audit-h3">{trimmed.slice(3)}</h3>;

    const cleanLine = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "").replace(/\*\*/g, "");
    const lower = cleanLine.toLowerCase();

    let icon = <ClipboardCheck className="audit-li-icon info" size={15} />;
    let cls  = "audit-item-row";

    if (lower.includes("violation") || lower.includes("missing") || lower.includes("critical")) {
      icon = <AlertOctagon className="audit-li-icon error" size={15} />;
      cls += " error-item";
    } else if (lower.includes("safety") || lower.includes("concern") || lower.includes("warning") || lower.includes("risk")) {
      icon = <ShieldAlert className="audit-li-icon warn" size={15} />;
      cls += " warn-item";
    } else if (lower.includes("observation") || lower.includes("note")) {
      icon = <HelpCircle className="audit-li-icon observation" size={15} />;
      cls += " observation-item";
    } else if (lower.includes("recommend") || lower.includes("immediate") || lower.includes("should")) {
      icon = <ShieldCheck className="audit-li-icon ok" size={15} />;
      cls += " ok-item";
    }

    return (
      <div key={index} className={cls}>
        {icon}
        <div className="audit-item-body">
          <span className="item-content">{cleanLine}</span>
        </div>
      </div>
    );
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Compliance() {
  const [documents,        setDocuments]        = useState<DocumentInfo[]>([]);
  const [selectedDocName,  setSelectedDocName]  = useState("");
  const [rawText,          setRawText]          = useState("");
  const [loadingText,      setLoadingText]      = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [auditResult,      setAuditResult]      = useState<string | null>(null);

  useEffect(() => {
    api.getDocuments()
      .then(setDocuments)
      .catch(console.error);
  }, []);

  // When user selects a doc, fetch its extracted text from the backend
  const handleSelectDoc = async (name: string) => {
    setSelectedDocName(name);
    setAuditResult(null);

    if (!name) {
      setRawText("");
      return;
    }

    setLoadingText(true);
    setRawText("");
    try {
      const result = await api.extractDocumentText(name);
      setRawText(result.text);
      toast.success(`Loaded "${name}" — ${result.text.length.toLocaleString()} characters`);
    } catch {
      toast.error(`Failed to extract text from "${name}".`);
      setRawText("");
    } finally {
      setLoadingText(false);
    }
  };

  const handleRunAudit = async () => {
    if (!rawText.trim()) {
      toast.warning("Load a document or paste text first.");
      return;
    }

    setLoading(true);
    setAuditResult(null);

    try {
      const res = await api.runComplianceCheck(rawText);
      setAuditResult(res.analysis);
      toast.success("Compliance audit complete");
    } catch {
      toast.error("Compliance audit failed. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container compliance-page">
      <Toaster position="top-right" richColors />

      <div className="compliance-layout">

        {/* ── Left: input form ── */}
        <div className="glass-card audit-form-section">
          <h3>SOP Audit Form</h3>
          <p className="section-desc">
            Select an ingested document to auto-load its text, or paste any SOP / procedure text below.
            PlantMind will audit it against regulatory standards in your knowledge base.
          </p>

          <div className="form-group">
            <label htmlFor="doc-selector">Load from Ingested Document</label>
            <select
              id="doc-selector"
              value={selectedDocName}
              onChange={(e) => handleSelectDoc(e.target.value)}
              disabled={loadingText}
            >
              <option value="">— Select an ingested PDF —</option>
              {documents.length === 0 ? (
                <option disabled>No documents uploaded yet</option>
              ) : (
                documents.map((doc) => (
                  <option key={doc.name} value={doc.name}>
                    {doc.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {loadingText && (
            <div className="text-loading-row">
              <Loader2 size={16} className="spin-icon" />
              <span>Extracting text from PDF...</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="sop-text">
              Document Content
              {rawText && (
                <span className="char-count">
                  {rawText.length.toLocaleString()} chars
                </span>
              )}
            </label>
            <textarea
              id="sop-text"
              rows={15}
              placeholder="Select a document above to auto-load its text, or paste any SOP / maintenance procedure here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              disabled={loadingText}
            />
          </div>

          <button
            className="audit-btn"
            onClick={handleRunAudit}
            disabled={loading || loadingText || !rawText.trim()}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Analyzing against safety guidelines...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Execute Compliance Audit</span>
              </>
            )}
          </button>
        </div>

        {/* ── Right: results ── */}
        <div className="glass-card audit-results-section">
          <h3>Audit Results &amp; Analysis</h3>
          <p className="section-desc">
            Violations, safety concerns, documentation gaps, and prioritised recommendations
            cross-referenced against your regulatory knowledge base.
          </p>

          {loading ? (
            <div className="results-loader">
              <div className="pulsing-radar">
                <span /><span />
              </div>
              <p>Gemini LLM auditing document against regulatory guidelines...</p>
            </div>
          ) : auditResult ? (
            <div className="audit-results-content animate-fade-in">
              <div className="audit-success-banner">
                <ShieldCheck size={20} className="success-banner-icon" />
                <div>
                  <h4>Audit Completed</h4>
                  <p>Review violations and implement recommendations below.</p>
                </div>
              </div>
              <div className="formatted-audit-report">
                {formatAuditText(auditResult)}
              </div>
            </div>
          ) : (
            <div className="results-empty-state">
              <FileText size={48} className="empty-icon" />
              <h4>Ready for Verification</h4>
              <p>
                Load a document or paste text on the left, then click
                <strong> Execute Compliance Audit</strong>.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
