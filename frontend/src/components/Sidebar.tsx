import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import {
  LayoutDashboard,
  FileText,
  MessageSquareCode,
  ShieldCheck,
  Wrench,
  Network,
  Cpu,
  BookOpen,
  GitCompare,
} from "lucide-react";

import "./Sidebar.css";

export default function Sidebar() {
  const [serverStatus, setServerStatus] =
    useState("Checking...");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/")
      .then(() =>
        setServerStatus(
          "FastAPI Connected"
        )
      )
      .catch(() =>
        setServerStatus(
          "Backend Offline"
        )
      );
  }, []);

  const links = [
    {
      to: "/",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
{
    to: "/maintenance",
    label: "Maintenance Planner",
    icon: CalendarClock,
},
    {
      to: "/documents",
      label: "Documents",
      icon: FileText,
    },

    {
      to: "/copilot",
      label: "Copilot",
      icon: MessageSquareCode,
    },

    {
      to: "/cross-reference",
      label: "Cross Reference",
      icon: GitCompare,
    },

    {
      to: "/compliance",
      label: "Compliance",
      icon: ShieldCheck,
    },

    {
      to: "/rca",
      label: "RCA Analyzer",
      icon: Wrench,
    },

    {
      to: "/graph",
      label: "Knowledge Graph",
      icon: Network,
    },

    {
      to: "/lessons",
      label: "Lessons Learned",
      icon: BookOpen,
    },
  ];

  return (
    <aside className="sidebar">

      <div className="sidebar-brand">
        <Cpu className="brand-icon" />

        <span className="brand-text">
          PlantMind{" "}
          <span className="brand-subText">
            AI
          </span>
        </span>
      </div>

      <nav className="sidebar-menu">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `sidebar-link ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
            >
              <Icon
                className="link-icon"
                size={20}
              />

              <span className="link-label">
                {link.label}
              </span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="status-indicator">
          <span className="pulse-dot"></span>

          <span className="status-text">
            {serverStatus}
          </span>
        </div>
      </div>

    </aside>
  );
}