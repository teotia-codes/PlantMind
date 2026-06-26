import { useState } from "react";
import {
  BookOpen, AlertTriangle, ShieldAlert, CheckCircle2,
  Lightbulb, TrendingUp, Sparkles, ClipboardList,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { api } from "../services/api";
import "./Lessons.css";

// ── Suggested queries to guide users ────────────────────────────────────────
const SUGGESTED_QUERIES = [
  "Pump bearing failures and overheating incidents",
  "Valve leakage patterns and seal degradation",
  "Boiler pressure relief events and root causes",
  "Turbine vibration anomalies and maintenance history",
];

// ── Markdown-aware renderer ──────────────────────────────────────────────────
function formatLessonsReport(text: string) {
  const lines = text.split("\n");

  return lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={index} className="lessons-spacer" />;

    // Bold section headers  **1. Key Lessons Learned**
    if (/^\*\*\d+\./.test(trimmed)) {
      const label = trimmed.replace(/\*\*/g, "").trim();
      const lower = label.toLowerCase();

      let Icon = ClipboardList;
      let categoryClass = "lessons-category lessons-cat-default";

      if (lower.includes("lesson"))          { Icon = Lightbulb;     categoryClass = "lessons-category lessons-cat-lesson"; }
      else if (lower.includes("pattern") || lower.includes("recurring")) { Icon = TrendingUp;    categoryClass = "lessons-category lessons-cat-pattern"; }
      else if (lower.includes("preventive") || lower.includes("measure")) { Icon = ShieldAlert;   categoryClass = "lessons-category lessons-cat-prevent"; }
      else if (lower.includes("warning") || lower.includes("proactive")) { Icon = AlertTriangle;  categoryClass = "lessons-category lessons-cat-warning"; }
      else if (lower.includes("best practice") || lower.includes("industry")) { Icon = CheckCircle2;  categoryClass = "lessons-category lessons-cat-best"; }

      return (
        <div key={index} className={categoryClass}>
          <Icon size={16} className="lessons-cat-icon" />
          <h4>{label}</h4>
        </div>
      );
    }

    // Markdown ## headers
    if (trimmed.startsWith("### ")) return <h5 key={index} className="lessons-h5">{trimmed.slice(4)}</h5>;
    if (trimmed.startsWith("## "))  return <h4 key={index} className="lessons-h4">{trimmed.slice(3)}</h4>;

    // Bullet or numbered list items
    const isBullet = /^[-•*]/.test(trimmed) || /^\d+\.\s/.test(trimmed);
    const cleanLine = trimmed.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "");

    if (isBullet) {
      // Colour-code by keyword
      const lower = cleanLine.toLowerCase();
      let itemClass = "lessons-bullet-item";
      if (lower.includes("critical") || lower.includes("failure") || lower.includes("hazard")) {
        itemClass += " item-critical";
      } else if (lower.includes("warning") || lower.includes("caution") || lower.includes("risk")) {
        itemClass += " item-warning";
      } else if (lower.includes("recommend") || lower.includes("best practice") || lower.includes("should")) {
        itemClass += " item-recommend";
      }

      return (
        <div key={index} className={itemClass}>
          <span className="bullet-dot" />
          <span>{cleanLine}</span>
        </div>
      );
    }

    // Regular paragraph — strip stray ** from inline bold
    const clean = trimmed.replace(/\*\*/g, "");
    return (
      <p key={index} className="lessons-paragraph">{clean}</p>
    );
  });
}

// ── Component ────────────────────────────────────────────────────────────────
export default function Lessons() {
  const [query, setQuery]     = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState("");

  const runAnalysis = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) {
      toast.warning("Enter an incident, equipment tag, or failure pattern.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await api.runLessons(text);
      setResult(response.analysis);
      toast.success("Lessons Learned report generated");
    } catch {
      toast.error("Failed to generate report. Check backend connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container lessons-page">
      <Toaster position="top-right" richColors />

      <div className="lessons-layout">

        {/* ── Left: Input panel ── */}
        <div className="glass-card lessons-form-section">
          <h3>Failure Intelligence Query</h3>
          <p className="section-desc">
            Enter an equipment tag, incident type, or failure mode. PlantMind will
            mine the knowledge base for historical patterns and push proactive warnings.
          </p>

          <div className="suggested-queries">
            <span className="sq-label">Quick queries:</span>
            <div className="sq-chips">
              {SUGGESTED_QUERIES.map((q, i) => (
                <button
                  key={i}
                  className="sq-chip"
                  onClick={() => { setQuery(q); runAnalysis(q); }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="lessons-query">Equipment / Incident / Failure Pattern</label>
            <textarea
              id="lessons-query"
              rows={6}
              placeholder="e.g. Pump P-101 bearing failures, overheating incidents in Boiler-301, vibration anomalies Turbine-A..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button
            className="lessons-btn"
            disabled={loading || !query.trim()}
            onClick={() => runAnalysis()}
          >
            {loading ? (
              <>
                <div className="spinner" />
                <span>Mining failure patterns...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Lessons Learned Report</span>
              </>
            )}
          </button>
        </div>

        {/* ── Right: Results panel ── */}
        <div className="glass-card lessons-results-section">
          <h3>Failure Intelligence Report</h3>
          <p className="section-desc">
            Pattern analysis and proactive warnings derived from your document knowledge base.
          </p>

          {loading ? (
            <div className="results-loader">
              <div className="spinner" style={{ width: 36, height: 36 }} />
              <p>Gemini LLM analysing historical failure patterns across knowledge base...</p>
            </div>
          ) : result ? (
            <div className="lessons-report animate-fade-in">
              <div className="lessons-success-banner">
                <BookOpen size={20} />
                <div>
                  <h4>Lessons Learned Report Ready</h4>
                  <p>Review patterns and act on preventive measures before next occurrence.</p>
                </div>
              </div>
              <div className="lessons-report-body">
                {formatLessonsReport(result)}
              </div>
            </div>
          ) : (
            <div className="results-empty-state">
              <BookOpen size={48} className="empty-icon" />
              <h4>Ready for Pattern Analysis</h4>
              <p>Enter a query or select a quick query on the left to generate your failure intelligence report.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
