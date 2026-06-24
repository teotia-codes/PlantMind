import { useLocation } from "react-router-dom";
import { Bell, Search, User, ShieldAlert } from "lucide-react";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();

  // Map route paths to nice human titles
  const getPageTitle = (path: string) => {
    switch (path) {
      case "/":
        return "Operational Dashboard";
      case "/documents":
        return "Document Ingestion & Knowledge Base";
      case "/copilot":
        return "Expert Knowledge Copilot";
      case "/compliance":
        return "Compliance & SOP Audits";
      case "/rca":
        return "Root Cause Analysis (RCA)";
      case "/graph":
        return "Plant Entity Knowledge Graph";
      default:
        return "PlantMind AI";
    }
  };

  return (
    <header className="navbar">
      <div className="navbar-left">
        <h1 className="navbar-title">{getPageTitle(location.pathname)}</h1>
      </div>
      <div className="navbar-right">
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input type="text" placeholder="Search telemetry, documents..." />
        </div>
        <div className="system-alert-badge">
          <ShieldAlert size={16} className="alert-icon" />
          <span>3 Active Alerts</span>
        </div>
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="badge-count">2</span>
        </button>
        <div className="user-profile">
          <div className="avatar">
            <User size={18} />
          </div>
          <div className="user-info">
            <span className="username">Engineer Desk</span>
            <span className="role">Control Room A</span>
          </div>
        </div>
      </div>
    </header>
  );
}
