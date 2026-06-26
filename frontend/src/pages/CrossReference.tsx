import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  GitCompare,
  Send,
  Sparkles,
  FileText,
  Clock,
  Copy,
  Download,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Lightbulb,
} from "lucide-react";

import "./CrossReference.css";

interface DocumentInfo {
  name: string;
  size: number;
  path: string;
  status: string;
}

interface Sections {
  agreements: string[];
  differences: string[];
  missing: string[];
  recommendations: string[];
}

export default function CrossReference() {

  const [documents, setDocuments] = useState<DocumentInfo[]>([]);

  const [docA, setDocA] = useState("");

  const [docB, setDocB] = useState("");

  const [question, setQuestion] = useState("");

  const [loading, setLoading] = useState(false);

  const [answer, setAnswer] = useState("");

  const [latency, setLatency] = useState<number>();

  useEffect(() => {
    api.getDocuments()
      .then(setDocuments)
      .catch(console.error);
  }, []);

  const parseSections = (text: string): Sections => {

    const sections: Sections = {
      agreements: [],
      differences: [],
      missing: [],
      recommendations: [],
    };

    let current = "";

    text.split("\n").forEach((line) => {

      const t = line.trim();

      if (!t) return;

      const lower = t.toLowerCase();

      if (lower.includes("agreement")) {
        current = "agreements";
        return;
      }

      if (lower.includes("difference")) {
        current = "differences";
        return;
      }

      if (lower.includes("missing")) {
        current = "missing";
        return;
      }

      if (
        lower.includes("recommendation")
      ) {
        current = "recommendations";
        return;
      }

      const clean = t
        .replace(/^[-•]/, "")
        .trim();

      switch (current) {

        case "agreements":
          sections.agreements.push(clean);
          break;

        case "differences":
          sections.differences.push(clean);
          break;

        case "missing":
          sections.missing.push(clean);
          break;

        case "recommendations":
          sections.recommendations.push(clean);
          break;

      }

    });

    return sections;

  };

  const sections = parseSections(answer);

  const compareDocuments = async () => {

    if (
      !docA ||
      !docB ||
      !question.trim()
    ) {
      return;
    }

    if (docA === docB) {

      alert(
        "Choose two different documents."
      );

      return;

    }

    setLoading(true);

    try {

      const res = await api.crossReference(
        question,
        docA,
        docB
      );

      setAnswer(res.answer);

      setLatency(res.latency);

    }

    catch (err) {

      console.error(err);

      alert("Comparison failed.");

    }

    finally {

      setLoading(false);

    }

  };

  const copyReport = async () => {

    await navigator.clipboard.writeText(
      answer
    );

    alert("Copied.");

  };

  const exportPDF = () => {

    const html =
      document.getElementById(
        "comparison-report"
      )?.innerHTML;

    const win = window.open();

    if (!win) return;

    win.document.write(`
      <html>

      <head>

      <title>
      Cross Document Report
      </title>

      <style>

      body{
      font-family:Arial;
      margin:40px;
      }

      h2{
      color:#2563eb;
      }

      </style>

      </head>

      <body>

      ${html}

      </body>

      </html>
    `);

    win.print();

  };
    return (

    <div className="page-container">

      <div className="glass-card cross-reference-page">

        {/* Header */}

        <div className="page-header">

          <div className="header-left">

            <div className="header-icon-wrapper">
              <GitCompare size={28} />
            </div>

            <div>

              <h2>Cross Document Analysis</h2>

              <p>
                Compare engineering knowledge across
                multiple industrial documents.
              </p>

            </div>

          </div>

          <div className="header-actions">

            <button
              className="secondary-btn"
              onClick={copyReport}
              disabled={!answer}
            >
              <Copy size={16} />
              Copy
            </button>

            <button
              className="secondary-btn"
              onClick={exportPDF}
              disabled={!answer}
            >
              <Download size={16} />
              PDF
            </button>

          </div>

        </div>

        {/* Selected Documents */}

        <div className="document-summary">

          <div className={`doc-card ${!docA ? 'empty' : ''}`}>

            <FileText size={18} />

            <div>

              <small>Document A</small>

              <strong>
                {docA || "No document selected"}
              </strong>

            </div>

          </div>

          <div className={`doc-card ${!docB ? 'empty' : ''}`}>

            <FileText size={18} />

            <div>

              <small>Document B</small>

              <strong>
                {docB || "No document selected"}
              </strong>

            </div>

          </div>

          {latency && (

            <div className="latency-card">

              <Clock size={18} />

              <span>

                {latency}s

              </span>

            </div>

          )}

        </div>

        {/* Document Selectors */}

        <div className="cross-grid">

          <div className="form-group">

            <label>

              Document A

            </label>

            <select
              value={docA}
              onChange={(e)=>
                setDocA(e.target.value)
              }
            >

              <option value="">
                Select Document
              </option>

              {documents.map(doc=>(
                <option
                  key={doc.name}
                  value={doc.name}
                >
                  {doc.name}
                </option>
              ))}

            </select>

          </div>

          <div className="form-group">

            <label>

              Document B

            </label>

            <select
              value={docB}
              onChange={(e)=>
                setDocB(e.target.value)
              }
            >

              <option value="">
                Select Document
              </option>

              {documents.map(doc=>(
                <option
                  key={doc.name}
                  value={doc.name}
                >
                  {doc.name}
                </option>
              ))}

            </select>

          </div>

        </div>

        {/* Question */}

        <div className="form-group">

          <label>

            Engineering Question

          </label>

          <textarea

            rows={5}

            value={question}

            onChange={(e)=>
              setQuestion(e.target.value)
            }

            placeholder="Compare maintenance strategy for Pump P-101"

          />

        </div>

        <button

          className="primary-btn"

          disabled={loading}

          onClick={compareDocuments}

        >

          {loading ?

            "Comparing Documents..." :

            <>

              <Send size={18}/>

              Compare Documents

            </>

          }

        </button>

        {/* Report */}

        {answer && (

          <div
            id="comparison-report"
            className="comparison-report"
          >

            <div className="report-title">

              <Sparkles size={18}/>

              <h2>

                AI Comparison Report

              </h2>

            </div>

            <div className="analysis-grid">

              <div className="analysis-card green">

                <div className="analysis-title">

                  <CheckCircle size={18}/>

                  Agreements

                </div>

                <ul>

                  {sections.agreements.map((item,index)=>(

                    <li key={index}>

                      {item}

                    </li>

                  ))}

                </ul>

              </div>

              <div className="analysis-card orange">

                <div className="analysis-title">

                  <AlertTriangle size={18}/>

                  Differences

                </div>

                <ul>

                  {sections.differences.map((item,index)=>(

                    <li key={index}>

                      {item}

                    </li>

                  ))}

                </ul>

              </div>

              <div className="analysis-card red">

                <div className="analysis-title">

                  <XCircle size={18}/>

                  Missing Information

                </div>

                <ul>

                  {sections.missing.map((item,index)=>(

                    <li key={index}>

                      {item}

                    </li>

                  ))}

                </ul>

              </div>

              <div className="analysis-card blue">

                <div className="analysis-title">

                  <Lightbulb size={18}/>

                  Recommendations

                </div>

                <ul>

                  {sections.recommendations.map((item,index)=>(

                    <li key={index}>

                      {item}

                    </li>

                  ))}

                </ul>

              </div>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}
