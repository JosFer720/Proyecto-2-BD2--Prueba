from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import Session
from db import get_session

router = APIRouter(prefix="/api/graph", tags=["Graph"])

LABEL_COLORS = {
    "User": "#3B82F6",
    "Post": "#10B981",
    "Community": "#F97316",
    "Game": "#EF4444",
    "Tag": "#8B5CF6",
    "Award": "#F59E0B",
}


@router.get("/subgraph")
def get_subgraph(
    center_id: str = Query(...),
    depth: int = Query(2, ge=1, le=3),
    limit: int = Query(200, ge=10, le=500),
    session: Session = Depends(get_session),
):
    query = """
    MATCH path = (center {id: $centerId})-[*1..""" + str(depth) + """]-(connected)
    WITH center, connected, relationships(path) AS rels
    LIMIT $limit
    WITH collect(DISTINCT center) + collect(DISTINCT connected) AS allNodes,
         collect(rels) AS allRelPaths
    UNWIND allNodes AS n
    WITH collect(DISTINCT n) AS nodes, allRelPaths
    UNWIND allRelPaths AS relPath
    UNWIND relPath AS r
    WITH nodes, collect(DISTINCT r) AS rels
    RETURN nodes, rels
    """

    try:
        result = session.run(query, centerId=center_id, limit=limit)
        record = result.single()

        if not record:
            raise HTTPException(404, "Node not found or no connections")

        nodes_data = []
        seen_ids = set()
        for node in record["nodes"]:
            node_id = node.get("id", str(node.id))
            if node_id in seen_ids:
                continue
            seen_ids.add(node_id)
            labels = list(node.labels)
            primary_label = labels[0] if labels else "Unknown"
            props = dict(node)
            nodes_data.append({
                "id": node_id,
                "label": primary_label,
                "labels": labels,
                "name": props.get("username") or props.get("name") or props.get("title") or node_id,
                "color": LABEL_COLORS.get(primary_label, "#6B7280"),
                "properties": {k: _serialize(v) for k, v in props.items()},
            })

        links_data = []
        seen_rels = set()
        for rel in record["rels"]:
            rel_id = rel.id
            if rel_id in seen_rels:
                continue
            seen_rels.add(rel_id)
            start_id = rel.start_node.get("id", str(rel.start_node.id))
            end_id = rel.end_node.get("id", str(rel.end_node.id))
            if start_id in seen_ids and end_id in seen_ids:
                links_data.append({
                    "source": start_id,
                    "target": end_id,
                    "type": rel.type,
                    "properties": {k: _serialize(v) for k, v in dict(rel).items()},
                })

        return {"nodes": nodes_data, "links": links_data}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/overview")
def get_overview(
    limit: int = Query(150, ge=10, le=500),
    session: Session = Depends(get_session),
):
    query = """
    MATCH (n)
    WITH n, rand() AS r
    ORDER BY r
    LIMIT $limit
    OPTIONAL MATCH (n)-[rel]-(m)
    WHERE m.id IS NOT NULL
    RETURN collect(DISTINCT n) AS nodes, collect(DISTINCT rel) AS rels
    """
    try:
        result = session.run(query, limit=limit)
        record = result.single()

        nodes_data = []
        seen_ids = set()
        for node in record["nodes"]:
            node_id = node.get("id", str(node.id))
            if node_id in seen_ids:
                continue
            seen_ids.add(node_id)
            labels = list(node.labels)
            primary_label = labels[0] if labels else "Unknown"
            props = dict(node)
            nodes_data.append({
                "id": node_id,
                "label": primary_label,
                "labels": labels,
                "name": props.get("username") or props.get("name") or props.get("title") or node_id,
                "color": LABEL_COLORS.get(primary_label, "#6B7280"),
                "properties": {k: _serialize(v) for k, v in props.items()},
            })

        links_data = []
        seen_rels = set()
        for rel in record["rels"]:
            if rel is None:
                continue
            rel_id = rel.id
            if rel_id in seen_rels:
                continue
            seen_rels.add(rel_id)
            start_id = rel.start_node.get("id", str(rel.start_node.id))
            end_id = rel.end_node.get("id", str(rel.end_node.id))
            if start_id in seen_ids and end_id in seen_ids:
                links_data.append({
                    "source": start_id,
                    "target": end_id,
                    "type": rel.type,
                    "properties": {k: _serialize(v) for k, v in dict(rel).items()},
                })

        return {"nodes": nodes_data, "links": links_data}
    except Exception as e:
        raise HTTPException(500, str(e))


def _serialize(v):
    if hasattr(v, "iso_format"):
        return v.iso_format()
    if isinstance(v, list):
        return [_serialize(item) for item in v]
    return v
