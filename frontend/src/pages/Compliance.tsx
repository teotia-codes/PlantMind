import { useState, useEffect } from "react";
import { api, type DocumentInfo } from "../services/api";
import { ShieldCheck, ShieldAlert, FileText, ClipboardCheck, AlertOctagon, HelpCircle } from "lucide-react";
import { toast, Toaster } from "sonner";
import "./Compliance.css";

const MOCK_TEMPLATE_SOP = `STANDARD OPERATING PROCEDURE: STEAM BOILER STARTUP
Tag: Boiler-301
Location: Power Plant West

1. PURPOSE & SCOPE
This document outlines standard parameters for lighting off Boiler-301 steam cycles. 

2. SAFETY REQUIREMENTS
- Hearing protection required.
- Fire suppression systems must be active. 
- Warning: Never exceed 150 PSI before cooling feedwater loop is at temperature.
- Note: Daily safety logs should be signed by shift supervisor.

3. STARTUP SEQUENCE
a. Verify feed pump loop is operational.
b. Inspect pressure relief valve V-202 configuration.
c. Initiate ignition cycle. If flame fail occurs, wait 5 minutes before restarting.
`;

export default function Compliance() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [selectedDocName, setSelectedDocName] = useState("");
  const [rawText, setRawText] = useState("");
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await api.getDocuments();
        setDocuments(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDocs();
  }, []);

  const handleSelectDoc = (name: string) => {
    setSelectedDocName(name);
    if (name === "boiler_sop_temp") {
      setRawText(MOCK_TEMPLATE_SOP);
    } else {
      // Simulate reading or tell user to type/paste
      setRawText(`-- CONTENT FROM DOC: ${name} --\n\n[System note: Analyze text contents of the document. Run the compliance check to vectorize and query this file's context against safety standards.]`);
    }
  };

  const handleRunAudit = async () => {
    if (!rawText.trim()) {
      toast.warning("Please paste SOP document text first.");
      return;
    }

    setLoading(true);
    setAuditResult(null);
    toast.info("Auditing document text against safety guidelines...");

    try {
      const res = await api.runComplianceCheck(rawText);
      setAuditResult(res.analysis);
      toast.success("Audit complete!");
    } catch (err) {
      console.error(err);
      toast.error("Compliance audit failed. Verify backend services.");
    } finally {
      setLoading(false);
    }
  };

  // Convert markdown-style numbered lists/headers to visual HTML items
  const formatAuditText = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="spacer-line" />;

      // Header matching
      if (trimmed.startsWith("###")) {
        return <h4 key={index} className="audit-h4">{trimmed.replace("###", "").trim()}</h4>;
      }
      if (trimmed.startsWith("##")) {
        return <h3 key={index} className="audit-h3">{trimmed.replace("##", "").trim()}</h3>;
      }
      if (trimmed.startsWith("#")) {
        return <h2 key={index} className="audit-h2">{trimmed.replace("#", "").trim()}</h2>;
      }

      // Check for bulleted/numbered items with specific keyword alerts
      const lower = trimmed.toLowerCase();
      let icon = <ClipboardCheck className="audit-li-icon info" size={16} />;
      let itemClass = "audit-item-row";

      if (lower.includes("violation") || lower.includes("missing") || lower.includes("critical")) {
        icon = <AlertOctagon className="audit-li-icon error" size={16} />;
        itemClass += " error-item";
      } else if (lower.includes("safety") || lower.includes("concern") || lower.includes("warning")) {
        icon = <ShieldAlert className="audit-li-icon warn" size={16} />;
        itemClass += " warn-item";
      } else if (lower.includes("observation") || lower.includes("audit")) {
        icon = <HelpCircle className="audit-li-icon observation" size={16} />;
        itemClass += " observation-item";
      }

      // Strip leading bullets/numbers
      const cleanLine = trimmed.replace(/^(\d+\.|\*|-)\s*/, "");

      return (
        <div key={index} className={itemClass}>
          {icon}
          <div className="audit-item-body">
            {trimmed.match(/^(\d+\.)/) && <span className="item-number">{trimmed.match(/^(\d+\.)/)?.[0]}</span>}
            <span className="item-content">{cleanLine}</span>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="page-container compliance-page">
      <Toaster position="top-right" richColors />
      <div className="compliance-layout">
        {/* Left Side: Inputs */}
        <div className="glass-card audit-form-section">
          <h3>SOP Audit Form</h3>
          <p className="section-desc">
            Load an ingested document or paste a custom Standard Operating Procedure (SOP) below.
          </p>

          <div className="form-group">
            <label htmlFor="doc-selector">Ingested Document Template</label>
            <select
              id="doc-selector"
              value={selectedDocName}
              onChange={(e) => handleSelectDoc(e.target.value)}
            >
              <option value="">-- Copy text or select template --</option>
              <option value="boiler_sop_temp">Boiler-301 Startup SOP Template</option>
              {documents.map((doc, idx) => (
                <option key={idx} value={doc.name}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="sop-text">Document Content (Text)</label>
            <textarea
              id="sop-text"
              rows={15}
              placeholder="Paste SOP instructions, safety limits, piping plans or maintenance schedules here..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          <button
            className="audit-btn"
            onClick={handleRunAudit}
            disabled={loading || !rawText.trim()}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Analyzing safety protocols...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Execute Compliance Audit</span>
              </>
            )}
          </button>
        </div>

        {/* Right Side: Results */}
        <div className="glass-card audit-results-section">
          <h3>Audit Results & Analysis</h3>
          <p className="section-desc">Real-time breakdown of violations, safety checks, and recommendations.</p>

          {loading ? (
            <div className="results-loader">
              <div className="pulsing-radar">
                <span></span>
                <span></span>
              </div>
              <p>Gemini LLM analyzing documentation against regulatory guidelines...</p>
            </div>
          ) : auditResult ? (
            <div className="audit-results-content animate-fade-in">
              <div className="audit-success-banner">
                <ShieldCheck size={20} className="success-banner-icon" />
                <div>
                  <h4>Audit Completed Successfully</h4>
                  <p>Check the observations and checklist report details below.</p>
                </div>
              </div>
              <div className="formatted-audit-report">{formatAuditText(auditResult)}</div>
            </div>
          ) : (
            <div className="results-empty-state">
              <FileText size={48} className="empty-icon" />
              <h4>Ready for Verification</h4>
              <p>Load or paste text on the left and run the audit. The results will populate here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
