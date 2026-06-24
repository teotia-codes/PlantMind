import { useState, useEffect } from "react";
import { api, type DocumentInfo } from "../services/api";
import {
  FileText,
  Activity,
  AlertTriangle,
  Heart,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import "./Dashboard.css";

// Sample Telemetry Data
const telemetryData = [
  { time: "08:00", pressure: 120, temp: 210, flow: 95 },
  { time: "09:00", pressure: 122, temp: 215, flow: 98 },
  { time: "10:00", pressure: 135, temp: 245, flow: 110 }, // Spike
  { time: "11:00", pressure: 128, temp: 230, flow: 104 },
  { time: "12:00", pressure: 121, temp: 212, flow: 94 },
  { time: "13:00", pressure: 119, temp: 208, flow: 92 },
  { time: "14:00", pressure: 123, temp: 218, flow: 97 },
];

const incidentHistory = [
  { month: "Jan", count: 4 },
  { month: "Feb", count: 3 },
  { month: "Mar", count: 6 },
  { month: "Apr", count: 2 },
  { month: "May", count: 1 },
  { month: "Jun", count: 3 },
];

export default function Dashboard() {
  const [docs, setDocs] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const data = await api.getDocuments();
        setDocs(data);
      } catch (err) {
        console.error("Failed to load documents on dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDocs();
  }, []);

  return (
    <div className="page-container dashboard-page">
      {/* Overview Cards */}
      <div className="dashboard-grid">
        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Ingested Knowledge Base</span>
            <div className="metric-icon-wrap accent-blue">
              <FileText size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">{loading ? "--" : docs.length}</span>
            <span className="metric-change positive">
              <ArrowUpRight size={14} /> +{docs.length} Active Files
            </span>
          </div>
          <div className="metric-footer">Sources analyzed via semantic RAG</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Plant Operating Health</span>
            <div className="metric-icon-wrap accent-green">
              <Activity size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">98.4%</span>
            <span className="metric-change positive">
              <ArrowUpRight size={14} /> Optimal
            </span>
          </div>
          <div className="metric-footer">Based on 6 active system metrics</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Active Telemetry Alerts</span>
            <div className="metric-icon-wrap accent-red">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">3</span>
            <span className="metric-change negative">
              1 Critical / 2 Warn
            </span>
          </div>
          <div className="metric-footer">Boiler-301 pressure exceeded limit</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-header">
            <span className="metric-title">Compliance Integrity</span>
            <div className="metric-icon-wrap accent-purple">
              <Heart size={20} />
            </div>
          </div>
          <div className="metric-body">
            <span className="metric-value">92%</span>
            <span className="metric-change positive">
              <TrendingUp size={14} /> +4% this month
            </span>
          </div>
          <div className="metric-footer">Safety & SOP audit score</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="charts-grid">
        <div className="glass-card chart-container">
          <div className="chart-header">
            <div>
              <h3>Steam Loop Telemetry</h3>
              <p className="chart-sub">Real-time pressure vs temperature correlation</p>
            </div>
            <div className="legend-pills">
              <span className="legend-pill pressure-pill">Pressure (PSI)</span>
              <span className="legend-pill temp-pill">Temp (°C)</span>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={telemetryData}>
                <defs>
                  <linearGradient id="colorPressure" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#aa3bff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#aa3bff" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c084fc" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--text)" fontSize={12} />
                <YAxis stroke="var(--text)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-h)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="pressure"
                  stroke="#aa3bff"
                  fillOpacity={1}
                  fill="url(#colorPressure)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="temp"
                  stroke="#c084fc"
                  fillOpacity={1}
                  fill="url(#colorTemp)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card chart-container">
          <div className="chart-header">
            <div>
              <h3>Monthly Industrial Incidents</h3>
              <p className="chart-sub">Incidents recorded and resolved in 2026</p>
            </div>
          </div>
          <div className="chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={incidentHistory}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text)" fontSize={12} />
                <YAxis stroke="var(--text)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "var(--card-bg)",
                    borderColor: "var(--border)",
                    color: "var(--text-h)",
                  }}
                />
                <Bar dataKey="count" fill="#aa3bff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Layout - Status and Actions */}
      <div className="bottom-dashboard-grid">
        <div className="glass-card table-section">
          <h3>Active Operational Alerts</h3>
          <div className="alert-list">
            <div className="alert-item high-priority">
              <span className="priority-badge">High</span>
              <div className="alert-info">
                <h4>Turbine-A Vibration Anomaly</h4>
                <p>Telemetry recorded vibration at 4.2mm/s (limit 3.5mm/s). Run RCA.</p>
              </div>
              <span className="alert-time">10 mins ago</span>
            </div>
            <div className="alert-item warn-priority">
              <span className="priority-badge">Warn</span>
              <div className="alert-info">
                <h4>Safety Audit Verification Missing</h4>
                <p>Boiler inspection log missing signature block in PDF checklist.</p>
              </div>
              <span className="alert-time">2 hours ago</span>
            </div>
            <div className="alert-item info-priority">
              <span className="priority-badge">Info</span>
              <div className="alert-info">
                <h4>Gemini Model Configuration Updated</h4>
                <p>Switched system prompts to use RAG framework optimizations.</p>
              </div>
              <span className="alert-time">Yesterday</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
