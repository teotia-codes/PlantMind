import json
import os
from neo4j import GraphDatabase

# ==========================================================
# Neo4j Configuration
# ==========================================================

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASS = os.getenv("NEO4J_PASS", "Sid@1133")

_driver = None


def _get_driver():
    global _driver

    if _driver is None:
        _driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASS)
        )

    return _driver


class _LazyDriver:

    def session(self, *args, **kwargs):
        return _get_driver().session(*args, **kwargs)

    def close(self):
        global _driver
        if _driver:
            _driver.close()


driver = _LazyDriver()

# ==========================================================
# JSON Sidecar
# ==========================================================

SIDECAR_PATH = "graph_data.json"


def _load_sidecar():

    if os.path.exists(SIDECAR_PATH):

        try:
            with open(SIDECAR_PATH, "r") as f:
                return json.load(f)

        except Exception:
            pass

    return {
        "nodes": [],
        "edges": []
    }


def _save_sidecar(data):

    with open(SIDECAR_PATH, "w") as f:
        json.dump(data, f, indent=2)


# ==========================================================
# Helpers
# ==========================================================

def _node_exists(nodes, node_id):
    return any(n["id"] == node_id for n in nodes)


def _edge_exists(edges, edge_id):
    return any(e["id"] == edge_id for e in edges)


def _add_node(data, node_id, label, node_type):

    if not _node_exists(data["nodes"], node_id):

        data["nodes"].append({
            "id": node_id,
            "label": label,
            "type": node_type
        })


def _add_edge(data, source, target, relation):

    edge_id = f"{source}_{relation}_{target}"

    if not _edge_exists(data["edges"], edge_id):

        data["edges"].append({
            "id": edge_id,
            "source": source,
            "target": target,
            "label": relation
        })


# ==========================================================
# Main Graph Builder
# ==========================================================

def save_graph(entities: dict, document_name: str):

    sidecar = _load_sidecar()

    equipment = entities.get("equipment", [])
    pressures = entities.get("pressures", [])
    temperatures = entities.get("temperatures", [])
    regulations = entities.get("regulations", [])
    incidents = entities.get("incidents", [])
    maintenance = entities.get("maintenance", [])
    relationships = entities.get("relationships", [])

    # ---------------------------
    # Document Node
    # ---------------------------

    _add_node(
        sidecar,
        document_name,
        document_name,
        "document"
    )

    try:

        with _get_driver().session() as session:

            session.run(
                """
                MERGE (d:Document {name:$name})
                """,
                name=document_name
            )

            # ====================================
            # Equipment
            # ====================================

            for eq in equipment:

                _add_node(
                    sidecar,
                    eq,
                    eq,
                    "equipment"
                )

                _add_edge(
                    sidecar,
                    eq,
                    document_name,
                    "MENTIONED_IN"
                )

                session.run(
                    """
                    MERGE (e:Equipment {name:$name})
                    """,
                    name=eq
                )

                session.run(
                    """
                    MATCH (e:Equipment {name:$eq})
                    MATCH (d:Document {name:$doc})
                    MERGE (e)-[:MENTIONED_IN]->(d)
                    """,
                    eq=eq,
                    doc=document_name
                )

            # ====================================
            # Pressure
            # ====================================

            for value in pressures:

                _add_node(
                    sidecar,
                    value,
                    value,
                    "pressure"
                )

                session.run(
                    """
                    MERGE (p:Pressure {name:$name})
                    """,
                    name=value
                )

                for eq in equipment:

                    _add_edge(
                        sidecar,
                        eq,
                        value,
                        "HAS_PRESSURE"
                    )

                    session.run(
                        """
                        MATCH (e:Equipment{name:$eq})
                        MATCH (p:Pressure{name:$val})
                        MERGE (e)-[:HAS_PRESSURE]->(p)
                        """,
                        eq=eq,
                        val=value
                    )

            # ====================================
            # Temperature
            # ====================================

            for value in temperatures:

                _add_node(
                    sidecar,
                    value,
                    value,
                    "temperature"
                )

                session.run(
                    """
                    MERGE (t:Temperature{name:$name})
                    """,
                    name=value
                )

                for eq in equipment:

                    _add_edge(
                        sidecar,
                        eq,
                        value,
                        "HAS_TEMPERATURE"
                    )

                    session.run(
                        """
                        MATCH (e:Equipment{name:$eq})
                        MATCH (t:Temperature{name:$val})
                        MERGE (e)-[:HAS_TEMPERATURE]->(t)
                        """,
                        eq=eq,
                        val=value
                    )

            # ====================================
            # Regulations
            # ====================================

            for reg in regulations:

                _add_node(
                    sidecar,
                    reg,
                    reg,
                    "regulation"
                )

                session.run(
                    """
                    MERGE (r:Regulation{name:$name})
                    """,
                    name=reg
                )

                for eq in equipment:

                    _add_edge(
                        sidecar,
                        eq,
                        reg,
                        "REGULATED_BY"
                    )

                    session.run(
                        """
                        MATCH (e:Equipment{name:$eq})
                        MATCH (r:Regulation{name:$reg})
                        MERGE (e)-[:REGULATED_BY]->(r)
                        """,
                        eq=eq,
                        reg=reg
                    )

            # ====================================
            # Incidents
            # ====================================

            for inc in incidents:

                _add_node(
                    sidecar,
                    inc,
                    inc,
                    "incident"
                )

                session.run(
                    """
                    MERGE (i:Incident{name:$name})
                    """,
                    name=inc
                )

                for eq in equipment:

                    _add_edge(
                        sidecar,
                        eq,
                        inc,
                        "HAS_INCIDENT"
                    )

                    session.run(
                        """
                        MATCH (e:Equipment{name:$eq})
                        MATCH (i:Incident{name:$inc})
                        MERGE (e)-[:HAS_INCIDENT]->(i)
                        """,
                        eq=eq,
                        inc=inc
                    )

            # ====================================
            # Maintenance
            # ====================================

            for m in maintenance:

                _add_node(
                    sidecar,
                    m,
                    m,
                    "maintenance"
                )

                session.run(
                    """
                    MERGE (m:Maintenance{name:$name})
                    """,
                    name=m
                )

                for eq in equipment:

                    _add_edge(
                        sidecar,
                        eq,
                        m,
                        "REQUIRES"
                    )

                    session.run(
                        """
                        MATCH (e:Equipment{name:$eq})
                        MATCH (m:Maintenance{name:$task})
                        MERGE (e)-[:REQUIRES]->(m)
                        """,
                        eq=eq,
                        task=m
                    )

            # ====================================
            # Equipment Relationships
            # ====================================

            for rel in relationships:

                src = rel["source"]
                tgt = rel["target"]
                relation = rel["relation"]

                _add_edge(
                    sidecar,
                    src,
                    tgt,
                    relation
                )

                session.run(
                    f"""
                    MERGE (a:Equipment {{name:$src}})
                    MERGE (b:Equipment {{name:$tgt}})
                    MERGE (a)-[:{relation}]->(b)
                    """,
                    src=src,
                    tgt=tgt
                )

    except Exception as e:

        print("[graph_service]", e)

    _save_sidecar(sidecar)


# ==========================================================
# Graph API
# ==========================================================

def get_graph_data():

    try:

        nodes = []
        edges = []

        with _get_driver().session() as session:

            node_query = session.run("""
                MATCH (n)
                RETURN elementId(n) as id,
                       labels(n)[0] as type,
                       n.name as label
            """)

            for row in node_query:

                nodes.append({
                    "id": str(row["id"]),
                    "label": row["label"],
                    "type": row["type"].lower()
                })

            edge_query = session.run("""
                MATCH (a)-[r]->(b)
                RETURN elementId(r) as id,
                       elementId(a) as source,
                       elementId(b) as target,
                       type(r) as relation
            """)

            for row in edge_query:

                edges.append({
                    "id": str(row["id"]),
                    "source": str(row["source"]),
                    "target": str(row["target"]),
                    "label": row["relation"]
                })

        return {
            "nodes": nodes,
            "edges": edges
        }

    except Exception:

        return _load_sidecar()


# ==========================================================
# Stats
# ==========================================================

def get_equipment_count():

    graph = get_graph_data()

    return len([
        n for n in graph["nodes"]
        if n["type"] == "equipment"
    ])


# ==========================================================
# Clear Graph
# ==========================================================

def clear_graph():

    try:

        with _get_driver().session() as session:

            session.run(
                "MATCH (n) DETACH DELETE n"
            )

    except:
        pass

    _save_sidecar({
        "nodes": [],
        "edges": []
    })