
import { useState, useEffect } from "react";
import { api } from "../services/api";
import {
  Wrench,
  ShieldAlert,
  Sparkles,
  CheckSquare,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import "./RCA.css";

export default function RCA() {
  const [equipment, setEquipment] = useState("");
  const [equipments, setEquipments] = useState<string[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [rcaResult, setRcaResult] = useState<string | null>(null);

  const [checkedSteps, setCheckedSteps] = useState<{
    [key: string]: boolean;
  }>({});

  useEffect(() => {
    api
      .getEquipment()
      .then((data) => {
        setEquipments(data);
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  const handleRunRCA = async () => {
    if (!equipment.trim() || !symptoms.trim()) {
      toast.warning(
        "Please select equipment and provide symptoms."
      );
      return;
    }

    setLoading(true);
    setRcaResult(null);
    setCheckedSteps({});

    try {
      const res = await api.runRCA(
        equipment,
        symptoms
      );

      setRcaResult(res.analysis);

      toast.success(
        "Root Cause Analysis completed"
      );
    } catch (err) {
      console.error(err);

      toast.error(
        "Failed to generate RCA"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStep = (
    stepKey: string
  ) => {
    setCheckedSteps((prev) => ({
      ...prev,
      [stepKey]: !prev[stepKey],
    }));
  };

  const formatRCAReport = (
    text: string
  ) => {
    const lines = text.split("\n");

    let currentCategory = "";

    return lines.map(
      (line, index) => {
        const trimmed =
          line.trim();

        if (!trimmed)
          return null;

        const lower =
          trimmed.toLowerCase();

        if (
          lower.includes(
            "root cause"
          )
        ) {
          currentCategory =
            "root-cause";

          return (
            <div
              key={index}
              className="rca-category-header mt-12"
            >
              <Sparkles
                size={16}
                className="rca-cat-icon spark"
              />
              <h4>
                Root Cause
              </h4>
            </div>
          );
        }

        if (
          lower.includes(
            "confidence"
          )
        ) {
          currentCategory =
            "confidence";

          return (
            <div
              key={index}
              className="rca-category-header mt-12"
            >
              <ShieldAlert
                size={16}
                className="rca-cat-icon alert"
              />
              <h4>
                Confidence
              </h4>
            </div>
          );
        }

        if (
          lower.includes(
            "inspection"
          )
        ) {
          currentCategory =
            "inspections";

          return (
            <div
              key={index}
              className="rca-category-header mt-12"
            >
              <ClipboardList
                size={16}
                className="rca-cat-icon list"
              />
              <h4>
                Recommended
                Inspections
              </h4>
            </div>
          );
        }

        if (
          lower.includes(
            "action"
          )
        ) {
          currentCategory =
            "actions";

          return (
            <div
              key={index}
              className="rca-category-header mt-12"
            >
              <CheckSquare
                size={16}
                className="rca-cat-icon check"
              />
              <h4>
                Corrective
                Actions
              </h4>
            </div>
          );
        }

        if (
          lower.includes(
            "prevention"
          )
        ) {
          currentCategory =
            "prevention";

          return (
            <div
              key={index}
              className="rca-category-header mt-12"
            >
              <CheckCircle2
                size={16}
                className="rca-cat-icon circle"
              />
              <h4>
                Prevention
              </h4>
            </div>
          );
        }

        const cleanLine =
          trimmed.replace(
            /^(\d+\.|\*|-|#)\s*/,
            ""
          );

        if (
          currentCategory ===
          "confidence"
        ) {
          return (
            <p
              key={index}
              className="confidence-text"
            >
              {cleanLine}
            </p>
          );
        }

        if (
          currentCategory ===
            "inspections" ||
          currentCategory ===
            "actions"
        ) {
          const stepKey = `${index}-${trimmed}`;

          const isChecked =
            !!checkedSteps[
              stepKey
            ];

          return (
            <label
              key={index}
              className={`checklist-item-row ${
                isChecked
                  ? "checked"
                  : ""
              }`}
            >
              <input
                type="checkbox"
                checked={
                  isChecked
                }
                onChange={() =>
                  handleToggleStep(
                    stepKey
                  )
                }
              />

              <span className="checkbox-custom"></span>

              <span className="checklist-text">
                {cleanLine}
              </span>
            </label>
          );
        }

        return (
          <p
            key={index}
            className="rca-standard-p"
          >
            {cleanLine}
          </p>
        );
      }
    );
  };

  return (
    <div className="page-container rca-page">
      <Toaster
        position="top-right"
        richColors
      />

      <div className="rca-layout">

        <div className="glass-card rca-form-section">

          <h3>
            RCA System Input
          </h3>

          <p className="section-desc">
            Select equipment and
            describe observed
            failures or abnormal
            behaviour.
          </p>

          <div className="form-group">
            <label>
              Equipment
            </label>

            <select
              value={equipment}
              onChange={(e) =>
                setEquipment(
                  e.target.value
                )
              }
            >
              <option value="">
                Select Equipment
              </option>

              {equipments.map(
                (eq) => (
                  <option
                    key={eq}
                    value={eq}
                  >
                    {eq}
                  </option>
                )
              )}
            </select>
          </div>

          <div className="form-group">
            <label>
              Symptoms
            </label>

            <textarea
              rows={8}
              placeholder="
Describe observed symptoms,
inspection findings,
equipment failures,
abnormal behaviour..."
              value={symptoms}
              onChange={(e) =>
                setSymptoms(
                  e.target.value
                )
              }
            />
          </div>

          <button
            className="rca-btn"
            onClick={
              handleRunRCA
            }
            disabled={
              loading
            }
          >
            {loading ? (
              <>
                <div className="spinner"></div>

                <span>
                  Generating
                  RCA using
                  uploaded
                  documents...
                </span>
              </>
            ) : (
              <>
                <Wrench
                  size={18}
                />

                <span>
                  Run Root
                  Cause
                  Analysis
                </span>
              </>
            )}
          </button>

        </div>

        <div className="glass-card rca-results-section">

          <h3>
            Root Cause
            Analysis Report
          </h3>

          <p className="section-desc">
            Generated from
            uploaded manuals,
            incidents and
            maintenance
            records.
          </p>

          {loading ? (
            <div className="results-loader">
              <div className="rotating-gear">
                <Wrench
                  size={40}
                  className="gear-icon"
                />
              </div>

              <p>
                Searching
                uploaded
                documents...
              </p>
            </div>
          ) : rcaResult ? (
            <div className="rca-results-content animate-fade-in">

              <div className="rca-success-banner">

                <CheckSquare
                  size={20}
                  className="success-banner-icon"
                />

                <div>
                  <h4>
                    RCA Report
                    Generated
                  </h4>

                  <p>
                    Review and
                    validate
                    actions.
                  </p>
                </div>

              </div>

              <div className="formatted-rca-report">
                {formatRCAReport(
                  rcaResult
                )}
              </div>

            </div>
          ) : (
            <div className="results-empty-state">

              <Wrench
                size={48}
                className="empty-icon"
              />

              <h4>
                Ready for
                Diagnosis
              </h4>

              <p>
                Select
                equipment and
                provide
                symptoms to
                generate RCA.
              </p>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}

