import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  CalendarClock,
  Wrench,
  Download,
  Copy,
  Clock,
} from "lucide-react";

import "./MaintenanceSchedule.css";

export default function MaintenanceSchedule() {

  const [equipment, setEquipment] = useState("");

  const [equipmentList, setEquipmentList] =
    useState<string[]>([]);

  const [horizon, setHorizon] =
    useState("30 Days");

  const [loading, setLoading] =
    useState(false);

  const [schedule, setSchedule] =
    useState("");

  const [sources, setSources] =
    useState<string[]>([]);

  const [latency, setLatency] =
    useState<number>();

  useEffect(() => {

    api.getEquipment()
      .then(setEquipmentList)
      .catch(console.error);

  }, []);

  async function generate() {

    if (!equipment) return;

    setLoading(true);

    try {

      const res =
        await api.maintenanceSchedule(
          equipment,
          horizon
        );

      setSchedule(res.schedule);

      setSources(res.sources);

      setLatency(res.latency);

    }

    catch(err){

      console.error(err);

      alert(
        "Unable to generate schedule."
      );

    }

    finally{

      setLoading(false);

    }

  }

  function copy(){

    navigator.clipboard.writeText(
      schedule
    );

    alert("Copied.");

  }

  function pdf(){

    const html =
      document.getElementById(
        "maintenance-report"
      )?.innerHTML;

    const win = window.open();

    if(!win) return;

    win.document.write(`

    <html>

    <head>

    <title>
    Maintenance Schedule
    </title>

    <style>

    body{

      font-family:Arial;

      margin:40px;

    }

    h1{

      color:#2563eb;

    }

    </style>

    </head>

    <body>

    <h1>

    PlantMind Maintenance Planner

    </h1>

    ${html}

    </body>

    </html>

    `);

    win.print();

  }
    return (

    <div className="page-container">

      <div className="glass-card maintenance-page">

        <div className="page-header">

          <div className="header-left">

            <CalendarClock size={28}/>

            <div>

              <h2>AI Maintenance Planner</h2>

              <p>
                Generate preventive maintenance schedules
                directly from uploaded manuals.
              </p>

            </div>

          </div>

          {schedule && (

            <div className="header-actions">

              <button
                className="secondary-btn"
                onClick={copy}
              >
                <Copy size={16}/>
                Copy
              </button>

              <button
                className="secondary-btn"
                onClick={pdf}
              >
                <Download size={16}/>
                PDF
              </button>

            </div>

          )}

        </div>

        <div className="planner-grid">

          <div className="form-group">

            <label>

              Equipment

            </label>

            <select
              value={equipment}
              onChange={(e)=>
                setEquipment(e.target.value)
              }
            >

              <option value="">
                Select Equipment
              </option>

              {equipmentList.map(item=>(

                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>

              ))}

            </select>

          </div>

          <div className="form-group">

            <label>

              Planning Horizon

            </label>

            <select
              value={horizon}
              onChange={(e)=>
                setHorizon(e.target.value)
              }
            >

              <option>30 Days</option>

              <option>90 Days</option>

              <option>1 Year</option>

            </select>

          </div>

        </div>

        <button

          className="primary-btn"

          onClick={generate}

          disabled={loading}

        >

          <Wrench size={18}/>

          {loading
            ? "Generating..."
            : "Generate Maintenance Schedule"}

        </button>

        {schedule && (

          <div
            id="maintenance-report"
            className="maintenance-report"
          >

            <div className="report-header">

              <h2>

                Preventive Maintenance Schedule

              </h2>

              {latency && (

                <span className="latency">

                  <Clock size={16}/>

                  {latency}s

                </span>

              )}

            </div>

            <pre className="schedule-text">

              {schedule}

            </pre>

            <div className="sources">

              <h3>

                Source Documents

              </h3>

              <ul>

                {sources.map(src=>(

                  <li key={src}>

                    {src}

                  </li>

                ))}

              </ul>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}