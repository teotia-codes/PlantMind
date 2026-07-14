import json
import os
from neo4j import GraphDatabase

# ==========================================================
# Neo4j Configuration
# ==========================================================

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASS = os.getenv("NEO4J_PASSWORD")

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

            with open(SIDECAR_PATH, "r", encoding="utf-8") as f:
                return json.load(f)

        except Exception:
            pass

    return {
        "nodes": [],
        "edges": []
    }


def _save_sidecar(data):

    with open(SIDECAR_PATH, "w", encoding="utf-8") as f:

        json.dump(
            data,
            f,
            indent=2,
            ensure_ascii=False
        )

# ==========================================================
# Helpers
# ==========================================================


def _normalize(text: str):

    if text is None:
        return ""

    return " ".join(
        text.strip().split()
    ).title()


def _node_exists(nodes, node_id):

    node_id = _normalize(node_id)

    return any(
        _normalize(n["id"]) == node_id
        for n in nodes
    )


def _edge_exists(edges, edge_id):

    return any(
        e["id"] == edge_id
        for e in edges
    )


def _find_node(nodes, node_id):

    node_id = _normalize(node_id)

    for node in nodes:

        if _normalize(node["id"]) == node_id:
            return node

    return None


def _add_node(
    data,
    node_id,
    label,
    node_type
):

    node_id = _normalize(node_id)
    label = _normalize(label)

    if _node_exists(
        data["nodes"],
        node_id
    ):
        return

    data["nodes"].append({

        "id": node_id,

        "label": label,

        "type": node_type,

        "metadata": {

            "documents": [],

            "degree": 0,

            "relationships": 0,

            "neighbors": []

        }

    })


def _update_metadata(
    data,
    node_id,
    neighbour,
    document=None
):

    node = _find_node(
        data["nodes"],
        node_id
    )

    if node is None:
        return

    meta = node.setdefault(
        "metadata",
        {}
    )

    meta.setdefault(
        "documents",
        []
    )

    meta.setdefault(
        "neighbors",
        []
    )

    meta.setdefault(
        "degree",
        0
    )

    meta.setdefault(
        "relationships",
        0
    )

    if neighbour not in meta["neighbors"]:
        meta["neighbors"].append(
            neighbour
        )

    meta["degree"] = len(
        meta["neighbors"]
    )

    meta["relationships"] = len(meta["neighbors"])
    meta["relationships"] += 1

    if (
        document
        and document not in meta["documents"]
    ):
        meta["documents"].append(
            document
        )
# ==========================================================
# Main Graph Builder
# ==========================================================

# ==========================================================
# Edge Helper
# ==========================================================

def _add_edge(
    data,
    source,
    target,
    relation,
    document=None
):

    source = _normalize(source)
    target = _normalize(target)

    edge_id = f"{source}_{relation}_{target}"

    if _edge_exists(
        data["edges"],
        edge_id
    ):
        return

    data["edges"].append({

        "id": edge_id,

        "source": source,

        "target": target,

        "label": relation

    })

    # Update source metadata

    _update_metadata(
        data,
        source,
        target,
        document
    )

    # Update target metadata

    _update_metadata(
        data,
        target,
        source,
        document
    )


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
                    "MENTIONED_IN",
                    document_name
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
                        "HAS_PRESSURE",
                        document_name
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
                        "HAS_TEMPERATURE",
                        document_name
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
                        "REGULATED_BY",
                        document_name
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
                        "HAS_INCIDENT",
                        document_name
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
                        "REQUIRES",
                        document_name
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
                    relation,
                    document_name
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

            # -------------------------------
            # Fetch Nodes
            # -------------------------------

            node_query = session.run("""
                MATCH (n)
                OPTIONAL MATCH (n)-[r]-()
                RETURN
                    elementId(n) AS id,
                    labels(n)[0] AS type,
                    n.name AS label,
                    COUNT(r) AS relationships
            """)

            id_to_label = {}

            for row in node_query:

                node_id = str(row["id"])
                label = row["label"]

                id_to_label[node_id] = label

                nodes.append({

                    "id": node_id,

                    "label": label,

                    "type": row["type"].lower(),

                    "metadata": {

                        "degree": row["relationships"],

                        "relationships": row["relationships"],

                        "documents": [],

                        "neighbors": []

                    }

                })

            # -------------------------------
            # Fetch Edges
            # -------------------------------

            edge_query = session.run("""
                MATCH (a)-[r]->(b)
                RETURN
                    elementId(r) AS id,
                    elementId(a) AS source,
                    elementId(b) AS target,
                    type(r) AS relation
            """)

            for row in edge_query:

                source = str(row["source"])
                target = str(row["target"])

                edges.append({

                    "id": str(row["id"]),

                    "source": source,

                    "target": target,

                    "label": row["relation"]

                })

            # -------------------------------
            # Build Neighbor Lists
            # -------------------------------

            node_lookup = {
                n["id"]: n
                for n in nodes
            }

            for edge in edges:

                src = edge["source"]
                tgt = edge["target"]

                if src in node_lookup:

                    neighbor = id_to_label.get(tgt, tgt)

                    if neighbor not in node_lookup[src]["metadata"]["neighbors"]:
                        node_lookup[src]["metadata"]["neighbors"].append(neighbor)

                if tgt in node_lookup:

                    node_lookup[tgt]["metadata"]["neighbors"].append(

                        id_to_label.get(
                            src,
                            src
                        )

                    )

            # -------------------------------
            # Documents connected to node
            # -------------------------------

            document_query = session.run("""
                MATCH (n)-[:MENTIONED_IN]->(d:Document)
                WITH n, collect(DISTINCT d.name) AS docs
                RETURN
                    elementId(n) AS id,
                    docs
            """)

            for row in document_query:

                node_id = str(row["id"])

                if node_id in node_lookup:

                    node_lookup[node_id]["metadata"]["documents"] = row["docs"]

        return {

            "nodes": nodes,

            "edges": edges

        }

    except Exception as e:

        print(

            "[graph_service] Neo4j unavailable, using sidecar:",

            e

        )

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