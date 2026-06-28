import { useState, useEffect, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Edge,
  type Node,
} from "reactflow";

import "reactflow/dist/style.css";

import { api } from "../services/api";

import {
  Network,
  RefreshCw,
  Cpu,
  HelpCircle,
  Search,
  Filter,
  Database,
  Link2,
  FileText,
  AlertTriangle,
  Thermometer,
  Activity,
} from "lucide-react";

import { toast, Toaster } from "sonner";

import "./KnowledgeGraph.css";

const NODE_COLORS: Record<
  string,
  {
    border: string;
    bg: string;
  }
> = {
  equipment: {
    border: "#8b5cf6",
    bg: "rgba(139,92,246,.12)",
  },

  regulation: {
    border: "#f97316",
    bg: "rgba(249,115,22,.12)",
  },

  incident: {
    border: "#ef4444",
    bg: "rgba(239,68,68,.12)",
  },

  maintenance: {
    border: "#10b981",
    bg: "rgba(16,185,129,.12)",
  },

  pressure: {
    border: "#3b82f6",
    bg: "rgba(59,130,246,.12)",
  },

  temperature: {
    border: "#eab308",
    bg: "rgba(234,179,8,.12)",
  },

  document: {
    border: "#64748b",
    bg: "rgba(100,116,139,.12)",
  },
};

const getTypeIcon = (type: string, size = 18) => {
  switch (type.toLowerCase()) {
    case "equipment":
      return <Cpu size={size} />;
    case "regulation":
      return <Filter size={size} />;
    case "incident":
      return <AlertTriangle size={size} />;
    case "maintenance":
      return <RefreshCw size={size} />;
    case "pressure":
      return <Activity size={size} />;
    case "temperature":
      return <Thermometer size={size} />;
    case "document":
      return <FileText size={size} />;
    default:
      return <HelpCircle size={size} />;
  }
};

export default function KnowledgeGraph() {

  const [nodes, setNodes] =
    useState<Node[]>([]);

  const [edges, setEdges] =
    useState<Edge[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [selectedNode, setSelectedNode] =
    useState<Node | null>(null);

  const [search, setSearch] =
    useState("");

  const [enabledTypes, setEnabledTypes] =
    useState<string[]>([
      "equipment",
      "incident",
      "maintenance",
      "pressure",
      "temperature",
      "regulation",
      "document",
    ]);

  const toggleType = (
    type: string
  ) => {

    setEnabledTypes(prev =>

      prev.includes(type)

        ? prev.filter(t => t !== type)

        : [...prev, type]

    );

  };

  const graphStats = useMemo(() => {

    const stats: Record<string, number> = {};

    nodes.forEach(node => {

      const t =
        String(
          node.data.type ??
          "other"
        );

      stats[t] =
        (stats[t] || 0) + 1;

    });

    return {

      equipment:
        stats.equipment || 0,

      maintenance:
        stats.maintenance || 0,

      regulation:
        stats.regulation || 0,

      pressure:
        stats.pressure || 0,

      temperature:
        stats.temperature || 0,

      incident:
        stats.incident || 0,

      document:
        stats.document || 0,

      relationships:
        edges.length,

    };

  }, [nodes, edges]);

  const visibleNodes = useMemo(() => {

    return nodes.map(node => {

      const type =
        String(
          node.data.type ??
          ""
        );

      const matchesSearch =

        node.id
          .toLowerCase()
          .includes(
            search.toLowerCase()
          ) ||

        String(node.data.label)
          .toLowerCase()
          .includes(
            search.toLowerCase()
          );

      const visible =

        enabledTypes.includes(type) &&
        (search === "" || matchesSearch);

      return {

        ...node,

        style: {

          ...node.style,

          opacity:
            visible
              ? 1
              : 0.18,

        },

      };

    });

  }, [
    nodes,
    search,
    enabledTypes,
  ]);

  const visibleEdges = useMemo(() => {

    return edges.filter(edge => {

      const src =
        visibleNodes.find(
          n => n.id === edge.source
        );

      const tgt =
        visibleNodes.find(
          n => n.id === edge.target
        );

      return (

        src?.style?.opacity === 1 &&
        tgt?.style?.opacity === 1

      );

    });

  }, [
    visibleNodes,
    edges,
  ]);
  const fetchGraphData = async () => {

  setLoading(true);
  setSelectedNode(null);

  try {

    const data = await api.getGraphData();

    const rfNodes: Node[] = data.nodes.map((n, idx) => {

      const color =
        NODE_COLORS[n.type] ??
        {
          border: "#3b82f6",
          bg: "rgba(59,130,246,.12)",
        };

      return {

        id: n.id,

        position: {

          x: 120 + (idx % 5) * 260,

          y: 100 + Math.floor(idx / 5) * 180,

        },

        data: {

          label: n.label,

          type: n.type,

          metadata: n.metadata ?? {},

        },

        style: {

          border: `2px solid ${color.border}`,

          background: color.bg,

          borderRadius: 10,

          padding: "10px 14px",

          color: "var(--text-h)",

          fontWeight: 600,

          fontSize: 13,

          boxShadow: `0 4px 14px ${color.border}33`,

          transition: ".25s",

        },

      };

    });

    const rfEdges: Edge[] = data.edges.map(edge => ({

      id: edge.id,

      source: edge.source,

      target: edge.target,

      label: edge.label,

      animated: true,

      style: {

        stroke: "var(--accent)",

        strokeWidth: 2,

      },

      labelStyle: {

        fill: "var(--text-h)",

        fontWeight: 600,

        fontSize: 10,

      },

    }));

    setNodes(rfNodes);

    setEdges(rfEdges);

  }

  catch (err) {

    console.error(err);

    toast.error(
      "Unable to load knowledge graph."
    );

  }

  finally {

    setLoading(false);

  }

};
  useEffect(() => {
    fetchGraphData();
  }, []);
const clearHighlight = () => {

  setSelectedNode(null);

  setNodes(prev =>

    prev.map(n => ({

      ...n,

      style: {

        ...n.style,

        opacity: 1,

        transform: "scale(1)",

      },

    }))

  );

};
  const handleNodeClick = (
  _event: React.MouseEvent,
  node: Node
) => {

  setSelectedNode(node);

  const neighbours = new Set<string>();

  edges.forEach(edge => {

    if (edge.source === node.id)
      neighbours.add(edge.target);

    if (edge.target === node.id)
      neighbours.add(edge.source);

  });

  setNodes(prev =>

    prev.map(n => ({

      ...n,

      style: {

        ...n.style,

        opacity:

          n.id === node.id ||

          neighbours.has(n.id)

            ? 1

            : 0.18,

        transform:

          n.id === node.id

            ? "scale(1.08)"

            : "scale(1)",

      },

    }))

  );

};

  const handleNeighborClick = (neighborId: string) => {
    const foundNode = nodes.find(n => n.id === neighborId);
    if (foundNode) {
      handleNodeClick(null as any, foundNode);
    } else {
      toast.info(`Node "${neighborId}" is not currently in the viewport.`);
    }
  };
  return (
    <div className="page-container graph-page">
      <Toaster position="top-right" richColors />

      <div className="graph-layout">
        <div className="glass-card graph-header-card">
          <div className="graph-title-row">
            <div className="title-area">
              <Network
                className="network-icon"
                size={22}
              />

              <div>
                <h3>
                  Industrial Knowledge Graph
                </h3>

                <p>
                  Relationships extracted
                  from uploaded documents
                  and stored in Neo4j.
                </p>
              </div>
            </div>

            <button
              className="icon-btn"
              onClick={fetchGraphData}
              title="Refresh Graph"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        <div className="graph-toolbar glass-card">

  <div className="graph-search">

    <Search size={18} />

    <input
      type="text"
      placeholder="Search equipment, regulations, incidents..."
      value={search}
      onChange={(e)=>setSearch(e.target.value)}
    />

  </div>

  <div className="graph-filters">

    <Filter size={18}/>

    {Object.keys(NODE_COLORS).map(type=>(

      <button

        key={type}

        onClick={()=>toggleType(type)}

        className={`filter-chip ${type} ${enabledTypes.includes(type) ? "active" : ""}`}

      >
        <span className="chip-icon">
          {getTypeIcon(type, 14)}
        </span>
        {type}

      </button>

    ))}

  </div>

</div>

<div className="graph-body-grid">
          <div className="glass-card flow-viewer-container">
            <div className="graph-legend">

<h4>

<Database size={16}/>

Graph Legend

</h4>

<div className="legend-grid">

{Object.entries(NODE_COLORS).map(

([type,color])=>(

<div
  key={type}
  className={`legend-item ${type}`}
>

<span

className="legend-icon-wrapper"

style={{
  background: color.bg,
  color: color.border
}}

>
  {getTypeIcon(type, 12)}
</span>

{type}

</div>

)

)}

</div>

</div>
            {loading ? (
              
              <div className="graph-loader">
                <div className="spinner" />
                <span>Loading graph entities...</span>
              </div>
            ) : nodes.length === 0 ? (
              <div className="graph-empty-state">
                <Network size={52} className="empty-icon" />
                <h4>Knowledge Graph Empty</h4>
                <p>
                  Upload documents on the <strong>Documents</strong> page.
                  Equipment entities extracted from PDFs will appear here automatically.
                </p>
              </div>
            ) : (
              <div className="react-flow-wrapper">
                <ReactFlow

    nodes={visibleNodes}

    edges={visibleEdges}

    onPaneClick={clearHighlight}

    nodesDraggable

    fitView

    fitViewOptions={{
        padding:.25
    }}

    onNodeClick={handleNodeClick}

>
                  <Background
                    color="var(--border)"
                    gap={16}
                    size={1}
                  />

                  <Controls />

                  <MiniMap

    zoomable

    pannable

    nodeStrokeWidth={3}

    nodeStrokeColor={(node)=>{

        const type=
            String(node.data?.type ?? "");

        return NODE_COLORS[type]?.border
            ?? "#3b82f6";

    }}

    nodeColor={(node)=>{

        const type=
            String(node.data?.type ?? "");

        return NODE_COLORS[type]?.bg
            ?? "#3b82f6";

    }}

    maskColor="rgba(0,0,0,.08)"

/>
                </ReactFlow>
              </div>
            )}
          </div>

          <div className="glass-card node-details-panel">
            <div className="panel-header">

<h3>

<Cpu size={18}/>

Entity Inspector

</h3>

</div>

            <p className="section-desc">
              Select any node to inspect
              graph metadata.
            </p>

            {selectedNode ? (

<div className="selected-node-info animate-fade-in">

    <div className={`node-badge-title ${String(selectedNode.data.type).toLowerCase()}`}>

        {getTypeIcon(String(selectedNode.data.type), 22)}

        <div>

            <h3>{selectedNode.data.label}</h3>

            <span className="node-type-badge">
                {String(selectedNode.data.type)}
            </span>

        </div>

    </div>

    <div className="node-specs">

        <div className="spec-row">

            <span className="spec-label">
                Node ID
            </span>

            <span className="spec-val">
                {selectedNode.id}
            </span>

        </div>

        <div className="spec-row">

            <span className="spec-label">
                Degree
            </span>

            <span className="spec-val">
                {
                    selectedNode.data.metadata?.degree ??
                    0
                }
            </span>

        </div>

        <div className="spec-row">

            <span className="spec-label">
                Relationships
            </span>

            <span className="spec-val">
                {
                    selectedNode.data.metadata?.relationships ??
                    0
                }
            </span>

        </div>

    </div>

    <div className="metadata-section">

        <h4>

            <FileText size={16}/>

            Documents

        </h4>

        {

            selectedNode.data.metadata?.documents?.length ?

            selectedNode.data.metadata.documents.map(

                (doc:string,index:number)=>(

                    <div
                        key={index}
                        className="meta-chip"
                    >

                        {doc}

                    </div>

                )

            )

            :

            <p>No linked documents</p>

        }

    </div>

    <div className="metadata-section">

        <h4>

            <Link2 size={16}/>

            Connected Nodes

        </h4>

        {

            selectedNode.data.metadata?.neighbors?.length ?

            selectedNode.data.metadata.neighbors.map(

                (neighbor:string,index:number)=>(

                    <div
                        key={index}
                        className="meta-chip secondary"
                        onClick={() => handleNeighborClick(neighbor)}
                    >

                        {neighbor}

                    </div>

                )

            )

            :

            <p>No neighbours</p>

        }

    </div>

</div>

) : (
          <>
            <div className="node-empty-state">
              <HelpCircle
                size={40}
                className="empty-icon"
              />

              <h4>
                Select a Node
              </h4>

              <p>
                Click an equipment,
                regulation,
                incident,
                maintenance task,
                or document
                to inspect
                its relationships.
              </p>
            </div>

            <div className="graph-stats-section">
              <h3>
                <Database size={16}/>
                Knowledge Graph Statistics
              </h3>

              <div className="stats-grid">
                <div className="stat-box equipment">
                  <h2>{graphStats.equipment}</h2>
                  <span>Equipment</span>
                </div>

                <div className="stat-box document">
                  <h2>{graphStats.document}</h2>
                  <span>Documents</span>
                </div>

                <div className="stat-box incident">
                  <h2>{graphStats.incident}</h2>
                  <span>Incidents</span>
                </div>

                <div className="stat-box regulation">
                  <h2>{graphStats.regulation}</h2>
                  <span>Regulations</span>
                </div>

                <div className="stat-box maintenance">
                  <h2>{graphStats.maintenance}</h2>
                  <span>Maintenance</span>
                </div>

                <div className="stat-box relationships">
                  <h2>{graphStats.relationships}</h2>
                  <span>Relationships</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  </div>
</div>
  );
}


