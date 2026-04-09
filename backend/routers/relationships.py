from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from neo4j import Session

from db import get_session
from serializers import serialize_value

router = APIRouter(prefix="/api/relationships", tags=["Relationships"])

# ── Whitelists ──────────────────────────────────────────────────────────────

ALLOWED_RELATIONSHIP_TYPES = {
    "MEMBER_OF", "WROTE", "POSTED_IN", "UPVOTED", "COMMENTED_ON",
    "FOLLOWS", "ABOUT", "TAGGED_WITH", "RELATED_TO",
    "RECEIVED_AWARD", "CROSSPOSTED_TO",
}

ALLOWED_NODE_LABELS = {"User", "Post", "Community", "Game", "Tag", "Award"}

# Date-typed property keys per relationship type
DATE_PROPERTIES: dict[str, set[str]] = {
    "MEMBER_OF":      {"joinedAt"},
    "WROTE":          {"postedAt", "editedAt"},
    "POSTED_IN":      {"postedAt"},
    "UPVOTED":        {"votedAt"},
    "COMMENTED_ON":   {"commentedAt"},
    "FOLLOWS":        {"followedAt"},
    "ABOUT":          {"taggedAt"},
    "TAGGED_WITH":    {"taggedAt"},
    "RELATED_TO":     {"linkedAt"},
    "RECEIVED_AWARD": {"awardedAt"},
    "CROSSPOSTED_TO": {"crosspostedAt"},
}

# ── Request models ──────────────────────────────────────────────────────────


class CreateRelBody(BaseModel):
    from_label: str
    from_id: str
    to_label: str
    to_id: str
    type: str
    properties: dict = {}


class UpdatePropsBody(BaseModel):
    from_label: str
    from_id: str
    to_label: str
    to_id: str
    type: str
    properties: dict = {}


class BatchUpdatePropsBody(BaseModel):
    type: str
    filter: dict = {}
    properties: dict = {}


class RemovePropsBody(BaseModel):
    from_label: str
    from_id: str
    to_label: str
    to_id: str
    type: str
    property_names: list[str]


class BatchRemovePropsBody(BaseModel):
    type: str
    filter: dict = {}
    property_names: list[str]


class DeleteSingleBody(BaseModel):
    from_label: str
    from_id: str
    to_label: str
    to_id: str
    type: str


class BatchDeleteBody(BaseModel):
    type: str
    filter: dict = {}


# ── Helpers ─────────────────────────────────────────────────────────────────


def _validate_type(rel_type: str) -> None:
    if rel_type not in ALLOWED_RELATIONSHIP_TYPES:
        raise HTTPException(400, f"Invalid relationship type: {rel_type}")


def _validate_label(label: str) -> None:
    if label not in ALLOWED_NODE_LABELS:
        raise HTTPException(400, f"Invalid node label: {label}")


def _date_keys_for(rel_type: str) -> set[str]:
    return DATE_PROPERTIES.get(rel_type, set())


def _build_props_set_clause(
    props: dict, rel_type: str, param_prefix: str = "prop"
) -> tuple[str, dict]:
    """Return a SET fragment and a params dict, wrapping date keys with date()."""
    if not props:
        return "", {}
    date_keys = _date_keys_for(rel_type)
    assignments: list[str] = []
    params: dict = {}
    for i, (k, v) in enumerate(props.items()):
        pname = f"{param_prefix}_{i}"
        if k in date_keys:
            assignments.append(f"r.{k} = date(${pname})")
        else:
            assignments.append(f"r.{k} = ${pname}")
        params[pname] = v
    return "SET " + ", ".join(assignments), params


def _build_filter_where(
    filt: dict, param_prefix: str = "f"
) -> tuple[str, dict]:
    """Build optional WHERE clauses from filter dict (from_label, to_label, from_id, to_id)."""
    clauses: list[str] = []
    params: dict = {}
    if "from_id" in filt:
        clauses.append(f"a.id = ${param_prefix}_from_id")
        params[f"{param_prefix}_from_id"] = filt["from_id"]
    if "to_id" in filt:
        clauses.append(f"b.id = ${param_prefix}_to_id")
        params[f"{param_prefix}_to_id"] = filt["to_id"]
    where = ""
    if clauses:
        where = "WHERE " + " AND ".join(clauses)
    return where, params


def _match_pattern(
    from_label: str | None, to_label: str | None, rel_type: str
) -> str:
    a_label = f":{from_label}" if from_label else ""
    b_label = f":{to_label}" if to_label else ""
    return f"MATCH (a{a_label})-[r:{rel_type}]->(b{b_label})"


# ── Endpoints ───────────────────────────────────────────────────────────────


@router.post("/")
def create_relationship(body: CreateRelBody, session: Session = Depends(get_session)):
    """Create a relationship between two nodes."""
    _validate_type(body.type)
    _validate_label(body.from_label)
    _validate_label(body.to_label)

    date_keys = _date_keys_for(body.type)
    props = dict(body.properties)

    # Separate date properties from regular ones
    regular_props: dict = {}
    date_set_parts: list[str] = []
    params: dict = {"from_id": body.from_id, "to_id": body.to_id}

    for k, v in props.items():
        if k in date_keys:
            pname = f"d_{k}"
            date_set_parts.append(f"r.{k} = date(${pname})")
            params[pname] = v
        else:
            regular_props[k] = v

    params["regular_props"] = regular_props

    query = (
        f"MATCH (a:{body.from_label} {{id: $from_id}}), "
        f"(b:{body.to_label} {{id: $to_id}}) "
        f"CREATE (a)-[r:{body.type}]->(b) "
        f"SET r += $regular_props"
    )
    if date_set_parts:
        query += ", " + ", ".join(date_set_parts)
    query += " RETURN r"

    try:
        result = session.run(query, params)
        record = result.single()
        if record is None:
            raise HTTPException(404, "One or both nodes not found")
        rel = record["r"]
        return {"relationship": {k: serialize_value(v) for k, v in rel.items()}, "type": body.type}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to create relationship: {e}")


@router.get("/")
def get_relationships(
    type: str,
    from_id: Optional[str] = None,
    to_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 25,
    session: Session = Depends(get_session),
):
    """Query relationships with optional filters."""
    _validate_type(type)

    where_clauses: list[str] = []
    params: dict = {"skip": skip, "limit": limit}

    if from_id:
        where_clauses.append("a.id = $from_id")
        params["from_id"] = from_id
    if to_id:
        where_clauses.append("b.id = $to_id")
        params["to_id"] = to_id

    where = ""
    if where_clauses:
        where = "WHERE " + " AND ".join(where_clauses)

    query = (
        f"MATCH (a)-[r:{type}]->(b) "
        f"{where} "
        f"RETURN a.id AS from_id, b.id AS to_id, properties(r) AS props "
        f"SKIP $skip LIMIT $limit"
    )

    try:
        result = session.run(query, params)
        rows = [
            {
                "from_id": rec["from_id"],
                "to_id": rec["to_id"],
                "type": type,
                "properties": {k: serialize_value(v) for k, v in rec["props"].items()} if rec["props"] else {},
            }
            for rec in result
        ]
        return rows
    except Exception as e:
        raise HTTPException(500, f"Failed to query relationships: {e}")


@router.patch("/properties")
def update_properties(body: UpdatePropsBody, session: Session = Depends(get_session)):
    """Add or update properties on a single relationship."""
    _validate_type(body.type)
    _validate_label(body.from_label)
    _validate_label(body.to_label)

    set_clause, extra_params = _build_props_set_clause(body.properties, body.type)
    if not set_clause:
        raise HTTPException(400, "No properties provided")

    params = {"from_id": body.from_id, "to_id": body.to_id, **extra_params}

    query = (
        f"MATCH (a:{body.from_label} {{id: $from_id}})"
        f"-[r:{body.type}]->"
        f"(b:{body.to_label} {{id: $to_id}}) "
        f"{set_clause} "
        f"RETURN r"
    )

    try:
        result = session.run(query, params)
        record = result.single()
        if record is None:
            raise HTTPException(404, "Relationship not found")
        return {"relationship": dict(record["r"]), "type": body.type}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to update properties: {e}")


@router.patch("/properties/batch")
def batch_update_properties(
    body: BatchUpdatePropsBody, session: Session = Depends(get_session)
):
    """Add or update properties on multiple relationships."""
    _validate_type(body.type)

    from_label = body.filter.get("from_label")
    to_label = body.filter.get("to_label")
    if from_label:
        _validate_label(from_label)
    if to_label:
        _validate_label(to_label)

    set_clause, extra_params = _build_props_set_clause(body.properties, body.type)
    if not set_clause:
        raise HTTPException(400, "No properties provided")

    match = _match_pattern(from_label, to_label, body.type)
    where, filter_params = _build_filter_where(body.filter)

    params = {**extra_params, **filter_params}

    query = f"{match} {where} {set_clause} RETURN count(r) AS updated"

    try:
        result = session.run(query, params)
        record = result.single()
        return {"updated": record["updated"] if record else 0}
    except Exception as e:
        raise HTTPException(500, f"Failed to batch update properties: {e}")


@router.delete("/properties")
def remove_properties(body: RemovePropsBody, session: Session = Depends(get_session)):
    """Remove properties from a single relationship."""
    _validate_type(body.type)
    _validate_label(body.from_label)
    _validate_label(body.to_label)

    if not body.property_names:
        raise HTTPException(400, "No property names provided")

    remove_parts = [f"r.{name}" for name in body.property_names]
    remove_clause = "REMOVE " + ", ".join(remove_parts)

    params = {"from_id": body.from_id, "to_id": body.to_id}

    query = (
        f"MATCH (a:{body.from_label} {{id: $from_id}})"
        f"-[r:{body.type}]->"
        f"(b:{body.to_label} {{id: $to_id}}) "
        f"{remove_clause} "
        f"RETURN r"
    )

    try:
        result = session.run(query, params)
        record = result.single()
        if record is None:
            raise HTTPException(404, "Relationship not found")
        return {"relationship": dict(record["r"]), "type": body.type}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to remove properties: {e}")


@router.delete("/properties/batch")
def batch_remove_properties(
    body: BatchRemovePropsBody, session: Session = Depends(get_session)
):
    """Remove properties from multiple relationships."""
    _validate_type(body.type)

    from_label = body.filter.get("from_label")
    to_label = body.filter.get("to_label")
    if from_label:
        _validate_label(from_label)
    if to_label:
        _validate_label(to_label)

    if not body.property_names:
        raise HTTPException(400, "No property names provided")

    remove_parts = [f"r.{name}" for name in body.property_names]
    remove_clause = "REMOVE " + ", ".join(remove_parts)

    match = _match_pattern(from_label, to_label, body.type)
    where, filter_params = _build_filter_where(body.filter)

    query = f"{match} {where} {remove_clause} RETURN count(r) AS updated"

    try:
        result = session.run(query, filter_params)
        record = result.single()
        return {"updated": record["updated"] if record else 0}
    except Exception as e:
        raise HTTPException(500, f"Failed to batch remove properties: {e}")


@router.delete("/single")
def delete_single(body: DeleteSingleBody, session: Session = Depends(get_session)):
    """Delete a single relationship."""
    _validate_type(body.type)
    _validate_label(body.from_label)
    _validate_label(body.to_label)

    params = {"from_id": body.from_id, "to_id": body.to_id}

    query = (
        f"MATCH (a:{body.from_label} {{id: $from_id}})"
        f"-[r:{body.type}]->"
        f"(b:{body.to_label} {{id: $to_id}}) "
        f"DELETE r "
        f"RETURN count(r) AS deleted"
    )

    try:
        result = session.run(query, params)
        record = result.single()
        deleted = record["deleted"] if record else 0
        if deleted == 0:
            raise HTTPException(404, "Relationship not found")
        return {"deleted": deleted}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to delete relationship: {e}")


@router.delete("/batch")
def batch_delete(body: BatchDeleteBody, session: Session = Depends(get_session)):
    """Delete multiple relationships matching filters."""
    _validate_type(body.type)

    from_label = body.filter.get("from_label")
    to_label = body.filter.get("to_label")
    if from_label:
        _validate_label(from_label)
    if to_label:
        _validate_label(to_label)

    match = _match_pattern(from_label, to_label, body.type)
    where, filter_params = _build_filter_where(body.filter)

    query = f"{match} {where} DELETE r RETURN count(r) AS deleted"

    try:
        result = session.run(query, filter_params)
        record = result.single()
        return {"deleted": record["deleted"] if record else 0}
    except Exception as e:
        raise HTTPException(500, f"Failed to batch delete: {e}")
