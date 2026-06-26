import json
import os
from neo4j import GraphDatabase

# ----------------------------------
# Neo4j Connection
# ----------------------------------

NEO4J_URI  = os.getenv("NEO4J_URI",  "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASS", "Sid@1133")

# Lazy driver — created once on first use so startup doesn't fail
# when Neo4j is unavailable.
_driver = None


def _get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASS),
        )
    return _driver


# Keep a module-level alias so main.py's existing
# `from rag.graph_service import driver` still works without crashing.
class _LazyDriver:
    """Proxy that forwards .session() to the real driver on first use."""

    def session(self, *args, **kwargs):
        return _get_driver().session(*args, **kwargs)

    def close(self):
        if _driver:
            _driver.close()


driver = _LazyDriver()

# ----------------------------------
# Local JSON sidecar for graph data
# (used as fallback when Neo4j is down)
# ----------------------------------

SIDECAR_PATH = "graph_data.json"


def _load_sidecar() -> dict:
    if os.path.exists(SIDECAR_PATH):
        try:
            with open(SIDECAR_PATH, "r") as f:
                return json.load(f)
        except Exception:
            pass
    return {"nodes": [], "edges": []}


def _save_sidecar(data: dict):
    try:
        with open(SIDECAR_PATH, "w") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[graph_service] Could not save sidecar: {e}")


# ----------------------------------
# Save Equipment Nodes
# ----------------------------------

def save_equipment(equipment_list: list[str]):
    """
    Persist equipment tags to Neo4j AND to the local JSON sidecar.
    The sidecar ensures the graph page always has data, even offline.
    """
    if not equipment_list:
        return

    # --- update sidecar first (always works) ---
    current = _load_sidecar()
    existing_ids = {n["id"] for n in current["nodes"]}

    for tag in equipment_list:
        if tag not in existing_ids:
            current["nodes"].append({
                "id":    tag,
                "label": tag,
                "type":  "equipment",
            })
            existing_ids.add(tag)

    # auto-link adjacent equipment in the list to show relationships
    for i in range(len(equipment_list) - 1):
        src, tgt = equipment_list[i], equipment_list[i + 1]
        edge_id = f"e_{src}_{tgt}"
        existing_edge_ids = {e["id"] for e in current["edges"]}
        if edge_id not in existing_edge_ids:
            current["edges"].append({
                "id":     edge_id,
                "source": src,
                "target": tgt,
                "label":  "co_referenced",
            })

    _save_sidecar(current)

    # --- try Neo4j (best-effort) ---
    try:
        with _get_driver().session() as session:
            for tag in equipment_list:
                session.run(
                    "MERGE (e:Equipment {name: $name})",
                    name=tag,
                )
    except Exception as e:
        print(f"[graph_service] Neo4j unavailable, using sidecar only: {e}")


# ----------------------------------
# Get Graph Data
# ----------------------------------

def get_graph_data() -> dict:
    """
    Try Neo4j first; fall back to the JSON sidecar; then fall back to
    a hardcoded demo graph so the UI is never blank.
    """

    # 1 — try Neo4j
    try:
        nodes, edges = [], []

        with _get_driver().session() as session:

            node_result = session.run(
                "MATCH (e:Equipment) RETURN e.name AS name"
            )
            for record in node_result:
                nodes.append({
                    "id":    record["name"],
                    "label": record["name"],
                    "type":  "equipment",
                })

            edge_result = session.run(
                """
                MATCH (a)-[r]->(b)
                RETURN a.name AS source,
                       b.name AS target,
                       type(r) AS relation
                """
            )
            for idx, record in enumerate(edge_result):
                edges.append({
                    "id":     f"edge_{idx}",
                    "source": record["source"],
                    "target": record["target"],
                    "label":  record["relation"].lower().replace("_", " "),
                })

        if nodes:
            return {"nodes": nodes, "edges": edges}

    except Exception as e:
        print(f"[graph_service] Neo4j query failed: {e}")

    # 2 — fall back to local sidecar (populated on every upload)
    sidecar = _load_sidecar()
    if sidecar["nodes"]:
        return sidecar

    # 3 — nothing ingested yet: return empty graph
    #     The frontend shows an actionable empty state instead of fake data.
    return {"nodes": [], "edges": []}


# ----------------------------------
# Helpers
# ----------------------------------

def create_relationship(source: str, target: str, relation: str = "CONNECTED_TO"):
    try:
        with _get_driver().session() as session:
            session.run(
                f"""
                MERGE (a:Equipment {{name: $source}})
                MERGE (b:Equipment {{name: $target}})
                MERGE (a)-[:{relation}]->(b)
                """,
                source=source,
                target=target,
            )
    except Exception as e:
        print(f"[graph_service] create_relationship failed: {e}")


def get_equipment_count() -> int:
    try:
        with _get_driver().session() as session:
            result = session.run(
                "MATCH (e:Equipment) RETURN count(e) AS total"
            )
            return result.single()["total"]
    except Exception:
        sidecar = _load_sidecar()
        return len(sidecar.get("nodes", []))


def clear_graph():
    try:
        with _get_driver().session() as session:
            session.run("MATCH (n) DETACH DELETE n")
    except Exception as e:
        print(f"[graph_service] clear_graph failed: {e}")

    # also clear sidecar
    _save_sidecar({"nodes": [], "edges": []})
