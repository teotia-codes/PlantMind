from neo4j import GraphDatabase

# ----------------------------------
# Neo4j Connection
# ----------------------------------

driver = GraphDatabase.driver(
    "bolt://localhost:7687",
    auth=("neo4j", "Sid@1133")
)

# ----------------------------------
# Save Equipment Nodes
# ----------------------------------

def save_equipment(equipment_list):

    if not equipment_list:
        return

    with driver.session() as session:

        for equipment in equipment_list:

            session.run(
                """
                MERGE (e:Equipment {
                    name:$name
                })
                """,
                name=equipment
            )

# ----------------------------------
# Create Relationship
# ----------------------------------

def create_relationship(
    source,
    target,
    relation="CONNECTED_TO"
):

    with driver.session() as session:

        session.run(
            f"""
            MERGE (a:Equipment {{
                name:$source
            }})

            MERGE (b:Equipment {{
                name:$target
            }})

            MERGE (a)-[:{relation}]->(b)
            """,
            source=source,
            target=target
        )

# ----------------------------------
# Get Graph Data
# ----------------------------------

def get_graph_data():

    nodes = []
    edges = []

    with driver.session() as session:

        # Nodes
        node_result = session.run(
            """
            MATCH (e:Equipment)
            RETURN e.name AS name
            """
        )

        for record in node_result:

            nodes.append({
                "id": record["name"],
                "label": record["name"],
                "type": "equipment"
            })

        # Relationships
        edge_result = session.run(
            """
            MATCH (a)-[r]->(b)
            RETURN
                a.name AS source,
                b.name AS target,
                type(r) AS relation
            """
        )

        for index, record in enumerate(edge_result):

            edges.append({
                "id": f"edge_{index}",
                "source": record["source"],
                "target": record["target"],
                "label": record["relation"]
            })

    return {
        "nodes": nodes,
        "edges": edges
    }

# ----------------------------------
# Equipment Count
# ----------------------------------

def get_equipment_count():

    with driver.session() as session:

        result = session.run(
            """
            MATCH (e:Equipment)
            RETURN count(e) AS total
            """
        )

        return result.single()["total"]

# ----------------------------------
# Delete Graph (Useful for Testing)
# ----------------------------------

def clear_graph():

    with driver.session() as session:

        session.run(
            """
            MATCH (n)
            DETACH DELETE n
            """
        )