
import { useState, useEffect } from "react";
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
} from "lucide-react";
import { toast, Toaster } from "sonner";
import "./KnowledgeGraph.css";

export default function KnowledgeGraph() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const fetchGraphData = async () => {
    setLoading(true);
    setSelectedNode(null);

    try {
      const data = await api.getGraphData();

      const rfNodes: Node[] = data.nodes.map((n, idx) => {
        const pos = {
          x: 100 + (idx % 4) * 250,
          y: 100 + Math.floor(idx / 4) * 180,
        };

        let style = {};

        if (n.type === "source") {
          style = {
            border: "2px solid #aa3bff",
            background: "rgba(170,59,255,0.08)",
            color: "var(--text-h)",
            borderRadius: "8px",
            padding: "10px 14px",
            fontWeight: "600",
            fontSize: "13px",
            boxShadow:
              "0 4px 12px rgba(170,59,255,0.1)",
          };
        } else if (n.type === "output") {
          style = {
            border: "2px solid #ef4444",
            background: "rgba(239,68,68,0.08)",
            color: "var(--text-h)",
            borderRadius: "8px",
            padding: "10px 14px",
            fontWeight: "600",
            fontSize: "13px",
            boxShadow:
              "0 4px 12px rgba(239,68,68,0.1)",
          };
        } else {
          style = {
            border: "2px solid #3b82f6",
            background: "rgba(59,130,246,0.08)",
            color: "var(--text-h)",
            borderRadius: "8px",
            padding: "10px 14px",
            fontWeight: "600",
            fontSize: "13px",
            boxShadow:
              "0 4px 12px rgba(59,130,246,0.1)",
          };
        }

        return {
          id: n.id,
          data: {
            label: n.label,
            metadata: n.metadata || {},
          },
          position: pos,
          style,
        };
      });

      const rfEdges: Edge[] = data.edges.map(
        (e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          label: e.label,
          animated: true,
          style: {
            stroke: "var(--accent)",
            strokeWidth: 2,
          },
          labelStyle: {
            fill: "var(--text-h)",
            fontSize: "10px",
            fontWeight: "600",
          },
        })
      );

      setNodes(rfNodes);
      setEdges(rfEdges);
    } catch (err) {
      console.error(err);
      toast.error(
        "Failed to load Neo4j Knowledge Graph"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraphData();
  }, []);

  const handleNodeClick = (
    _event: React.MouseEvent,
    node: Node
  ) => {
    setSelectedNode(node);
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

        <div className="graph-body-grid">
          <div className="glass-card flow-viewer-container">
            {loading ? (
              <div className="graph-loader">
                <div className="spinner"></div>

                <span>
                  Loading graph
                  entities...
                </span>
              </div>
            ) : (
              <div className="react-flow-wrapper">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={
                    handleNodeClick
                  }
                  fitView
                >
                  <Background
                    color="var(--border)"
                    gap={16}
                    size={1}
                  />

                  <Controls />

                  <MiniMap
                    nodeStrokeColor={(
                      n
                    ) => {
                      const borderStr =
                        String(
                          n.style
                            ?.border || ""
                        );

                      if (
                        borderStr.includes(
                          "ef4444"
                        )
                      )
                        return "#ef4444";

                      if (
                        borderStr.includes(
                          "aa3bff"
                        )
                      )
                        return "#aa3bff";

                      return "#3b82f6";
                    }}
                    nodeColor={() =>
                      "var(--code-bg)"
                    }
                    maskColor="rgba(0,0,0,0.1)"
                  />
                </ReactFlow>
              </div>
            )}
          </div>

          <div className="glass-card node-details-panel">
            <h3>Entity Details</h3>

            <p className="section-desc">
              Select any node to inspect
              graph metadata.
            </p>

            {selectedNode ? (
              <div className="selected-node-info animate-fade-in">
                <div className="node-badge-title">
                  <Cpu
                    size={18}
                    className="node-icon"
                  />

                  <h4>
                    {selectedNode.id}
                  </h4>
                </div>

                <div className="node-specs">
                  <div className="spec-row">
                    <span className="spec-label">
                      Entity ID
                    </span>

                    <span className="spec-val">
                      {selectedNode.id}
                    </span>
                  </div>

                  <div className="spec-row">
                    <span className="spec-label">
                      Entity Type
                    </span>

                    <span className="spec-val">
                      {String(
                        selectedNode
                          .data.label
                      )}
                    </span>
                  </div>

                  {"metadata" in
                    selectedNode.data &&
                    selectedNode.data
                      .metadata &&
                    Object.entries(
                      selectedNode.data
                        .metadata
                    ).map(
                      ([key, value]) => (
                        <div
                          key={key}
                          className="spec-row"
                        >
                          <span className="spec-label">
                            {key}
                          </span>

                          <span className="spec-val">
                            {String(
                              value
                            )}
                          </span>
                        </div>
                      )
                    )}
                </div>
              </div>
            ) : (
              <div className="node-empty-state">
                <HelpCircle
                  size={40}
                  className="empty-icon"
                />

                <h4>
                  No Entity Selected
                </h4>

                <p>
                  Click any node to
                  inspect graph
                  information.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

