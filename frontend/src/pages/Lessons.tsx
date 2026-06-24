
import { useState } from "react";
import { BookOpen, AlertTriangle, CheckCircle, Sparkles } from "lucide-react";
import { toast, Toaster } from "sonner";
import { api } from "../services/api";
import "./Lessons.css";

export default function Lessons() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  const runLessonsAnalysis = async () => {
    if (!query.trim()) {
      toast.warning("Enter an incident, equipment, or failure pattern.");
      return;
    }

    setLoading(true);
    setResult("");

    try {
      const response = await api.runLessons(query);

      setResult(response.analysis);

      toast.success(
        "Lessons Learned Analysis Complete"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        "Failed to generate lessons learned report."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Toaster position="top-right" richColors />

      <div className="glass-card">

        <div className="page-header">

          <BookOpen size={24} />

          <div>
            <h2>Lessons Learned Agent</h2>

            <p>
              Analyze historical incidents and
              identify recurring failure patterns.
            </p>
          </div>

        </div>

        <div className="form-group">

          <label>
            Equipment / Incident Query
          </label>

          <textarea
            rows={5}
            placeholder="Example: Pump P-101 bearing failures, overheating incidents, maintenance delays..."
            value={query}
            onChange={(e) =>
              setQuery(e.target.value)
            }
          />

        </div>

        <button
          className="primary-btn"
          disabled={loading}
          onClick={runLessonsAnalysis}
        >
          {loading ? (
            <>
              <Sparkles size={18} />
              Generating Lessons...
            </>
          ) : (
            <>
              <BookOpen size={18} />
              Analyze Historical Incidents
            </>
          )}
        </button>

        {result && (
          <div className="results-section">

            <div className="result-header">

              <AlertTriangle size={20} />

              <h3>
                Lessons Learned Report
              </h3>

            </div>

            <div className="result-content">

              {result
                .split("\n")
                .filter(Boolean)
                .map((line, index) => (
                  <div
                    key={index}
                    className="result-line"
                  >
                    <CheckCircle
                      size={16}
                    />

                    <span>{line}</span>
                  </div>
                ))}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
