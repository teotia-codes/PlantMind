import { useState, useEffect, useCallback } from "react";
import {
  api,
  type SystemStats,
  type DocumentInfo,
  type ActivityEvent,
} from "../services/api";
import {
  FileText, Activity, Database, Network,
  ArrowUpRight, RefreshCw, Upload,
  CheckCircle2, Clock, Layers,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
} from "recharts";
import "./Dashboard.css";

// ── helpers ─────────────────────────────────────────────────────────────────

function formatBytes(kb: number): string {
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function relativeTime(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000 - unixSeconds);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Build a per-document chunk bar chart from activity events
function buildChunkChart(events: ActivityEvent[]) {
  return events
    .filter((e) => e.type === "upload")
    .slice()
    .reverse()                     // oldest first for chart
    .slice(-8)                     // last 8 uploads
    .map((e) => ({
      name: e.filename ? e.filename.replace(/\.pdf$/i, "").slice(0, 16) : "Unknown",
      chunks: e.chunks ?? 0,
    }));
}

// Build a "chunks over time" accumulation chart
function buildAccumulationChart(events: ActivityEvent[]) {
  let running = 0;
  return events
    .filter((e) => e.type === "upload")
    .slice()
    .reverse()
    .map((e, i) => {
      running += e.chunks ?? 0;
      return {
        label: `Upload ${i + 1}`,
        total: running,
      };
    });
}

// ── component ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, docsData, activityData] = await Promise.all([
        api.getStats(),
        api.getDocuments(),
        api.getActivity(),
      ]);
      setStats(statsData);
      setDocs(docsData);
      setActivity(activityData);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Dashboard fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const fmt = (n: number | undefined) =>
    loading ? "--" : (n ?? 0).toLocaleString();

  const chunkChart = buildChunkChart(activity);
  const accumulationChart = buildAccumulationChart(activity);
  const hasData = activity.length > 0;

  // ── render ──────────────────────────────────────────────────────────────
  return (
    <div className="page-container dashboard-page">

      {/* ── 4 live metric cards ── */}
      <div className="dashboard-grid">

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Ingested Documents</span>
            <div className="metric-icon-wrap accent-blue">
              <FileText size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{fmt(stats?.documents)}</span>
            <span className="metric-change positive">
              <ArrowUpRight size={14} />
              {fmt(stats?.documents)} PDF files indexed
            </span>
          </div>
          <div className="metric-footer">
            Source documents in knowledge base
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Vector Chunks</span>
            <div className="metric-icon-wrap accent-purple">
              <Database size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{fmt(stats?.chunks)}</span>
            <span className="metric-change positive">
              <ArrowUpRight size={14} />
              Semantic segments indexed
            </span>
          </div>
          <div className="metric-footer">
            MiniLM-L6-v2 · ChromaDB cosine store
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Equipment Entities</span>
            <div className="metric-icon-wrap accent-green">
              <Activity size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{fmt(stats?.equipment)}</span>
            <span className="metric-change positive">
              <ArrowUpRight size={14} />
              Extracted from documents
            </span>
          </div>
          <div className="metric-footer">
            Nodes persisted to knowledge graph
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Avg Chunks / Doc</span>
            <div className="metric-icon-wrap accent-orange">
              <Layers size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">
              {loading || !stats?.documents
                ? "--"
                : Math.round((stats.chunks ?? 0) / stats.documents).toLocaleString()}
            </span>
            <span className="metric-change positive">
              <ArrowUpRight size={14} />
              Per ingested document
            </span>
          </div>
          <div className="metric-footer">
            800-char sentence-aware chunks · 100-char overlap
          </div>
        </div>
      </div>

      {/* ── Charts row — built from real activity data ── */}
      {hasData ? (
        <div className="charts-grid">

          <div className="glass-card chart-container">
            <div className="chart-header">
              <div>
                <h3>Chunks per Document</h3>
                <p className="chart-sub">
                  Vector segments extracted from each ingested PDF
                </p>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chunkChart} margin={{ left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text)" fontSize={11} />
                  <YAxis stroke="var(--text)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card-bg)",
                      borderColor: "var(--border)",
                      color: "var(--text-h)",
                      fontSize: 13,
                    }}
                    formatter={(value) => [
  `${Number(value ?? 0)} chunks`,
  "Chunks",
]}
                  />
                  <Bar dataKey="chunks" radius={[4, 4, 0, 0]}>
                    {chunkChart.map((_, i) => (
                      <Cell
                        key={i}
                        fill={i % 2 === 0 ? "#aa3bff" : "#c084fc"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card chart-container">
            <div className="chart-header">
              <div>
                <h3>Knowledge Base Growth</h3>
                <p className="chart-sub">
                  Cumulative vector chunks as documents were ingested
                </p>
              </div>
            </div>
            <div className="chart-body">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={accumulationChart} margin={{ left: -10 }}>
                  <defs>
                    <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#aa3bff" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#aa3bff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--text)" fontSize={11} />
                  <YAxis stroke="var(--text)" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card-bg)",
                      borderColor: "var(--border)",
                      color: "var(--text-h)",
                      fontSize: 13,
                    }}
                    formatter={(value) => [
  `${Number(value ?? 0)} total chunks`,
  "KB Total",
]}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#aa3bff"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#totalGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="glass-card charts-empty-state">
            <Upload size={40} className="empty-icon" />
            <h3>No data yet</h3>
            <p>
              Upload your first PDF on the <strong>Documents</strong> page.
              Charts will populate automatically as documents are ingested.
            </p>
          </div>
        )
      )}

      {/* ── Bottom row: documents table + activity feed ── */}
      <div className="bottom-dashboard-grid">

        {/* Documents table */}
        <div className="glass-card table-section">
          <div className="section-header-row">
            <h3>Ingested Documents</h3>
            <button className="icon-btn" onClick={fetchData} title="Refresh">
              <RefreshCw size={16} />
            </button>
          </div>

          {loading ? (
            <div className="table-loader">
              <div className="spinner" />
              <span>Fetching from knowledge base...</span>
            </div>
          ) : docs.length === 0 ? (
            <div className="empty-docs">
              <FileText size={32} className="empty-icon" />
              <p>No documents ingested yet. Upload a PDF on the Documents page.</p>
            </div>
          ) : (
            <table className="mini-doc-table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Size</th>
                  <th>Chunks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const event = activity.find((a) => a.filename === doc.name);
                  return (
                    <tr key={doc.name}>
                      <td className="doc-name-cell">
                        <FileText size={14} />
                        <span>{doc.name}</span>
                      </td>
                      <td>{(doc.size / 1024).toFixed(1)} KB</td>
                      <td>{event ? event.chunks : "--"}</td>
                      <td>
                        <span className="status-pill status-processed">
                          <CheckCircle2 size={11} /> Active RAG
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Real activity feed */}
        <div className="glass-card table-section">
          <div className="section-header-row">
            <h3>Ingestion Activity</h3>
            <Network size={16} className="section-icon" />
          </div>

          {loading ? (
            <div className="table-loader">
              <div className="spinner" />
              <span>Loading activity...</span>
            </div>
          ) : activity.length === 0 ? (
            <div className="empty-docs">
              <Clock size={32} className="empty-icon" />
              <p>No activity yet. Upload documents to see the ingestion feed here.</p>
            </div>
          ) : (
            <div className="alert-list">
              {activity.map((event, i) => {
                const isSystem = event.type === "system";
                return (
                  <div key={i} className={`alert-item info-priority activity-row ${isSystem ? 'system-activity' : ''}`}>
                    <span className="priority-badge">
                      {isSystem ? <Network size={11} /> : <Upload size={11} />}
                    </span>
                    <div className="alert-info">
                      {isSystem ? (
                        <>
                          <h4>System Update</h4>
                          <p>{event.message}</p>
                        </>
                      ) : (
                        <>
                          <h4>{event.filename}</h4>
                          <p>
                            {event.chunks ?? 0} chunks · {formatBytes(event.size_kb ?? 0)} ingested
                          </p>
                        </>
                      )}
                    </div>
                    <span className="alert-time">
                      {relativeTime(event.timestamp)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-refresh-footer">
        Last refreshed: {lastRefreshed.toLocaleTimeString()} · auto-refreshes every 30 s
      </div>
    </div>
  );
}
