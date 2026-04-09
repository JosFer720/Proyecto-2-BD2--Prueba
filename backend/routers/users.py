from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import Session
from db import get_session
import uuid
from typing import Optional
from pydantic import BaseModel

router = APIRouter(prefix="/api/users", tags=["Users"])

PRIMARY_LABEL = "User"
ALLOWED_LABELS = {"User", "Moderator", "Admin", "Bot"}
ALLOWED_FILTER_KEYS = {"id", "username", "joinDate", "karmaPoints", "isPremium"}
AGGREGATE_FIELDS = {"karmaPoints"}


# ── Pydantic models ──────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    joinDate: str
    karmaPoints: int = 0
    isPremium: bool = False
    favoriteGenres: list[str] = []


class MultiLabelCreate(BaseModel):
    labels: list[str]
    properties: dict


class PropertiesUpdate(BaseModel):
    properties: dict


class BatchPropertyUpdate(BaseModel):
    filter: dict
    properties: dict


class PropertyNamesDelete(BaseModel):
    property_names: list[str]


class BatchPropertyDelete(BaseModel):
    filter: dict
    property_names: list[str]


class BatchDelete(BaseModel):
    filter: dict


# ── Helpers ───────────────────────────────────────────────────────

def _build_where(filter_dict: dict, alias: str = "n", param_prefix: str = "f"):
    conditions = []
    params = {}
    for i, (key, value) in enumerate(filter_dict.items()):
        if key not in ALLOWED_FILTER_KEYS:
            raise HTTPException(status_code=400, detail=f"Filter key '{key}' is not allowed")
        p = f"{param_prefix}{i}"
        conditions.append(f"{alias}.{key} = ${p}")
        params[p] = value
    where = "WHERE " + " AND ".join(conditions) if conditions else ""
    return where, params


def _node_to_dict(record, alias: str = "n"):
    from serializers import node_to_dict
    return node_to_dict(record, alias)


# ── 1. Create node ───────────────────────────────────────────────

@router.post("/")
def create_user(body: UserCreate, session: Session = Depends(get_session)):
    uid = str(uuid.uuid4())
    query = (
        "CREATE (n:User {id: $id, username: $username, joinDate: date($joinDate), "
        "karmaPoints: $karmaPoints, isPremium: $isPremium, favoriteGenres: $favoriteGenres}) "
        "RETURN n"
    )
    result = session.run(query, {
        "id": uid,
        "username": body.username,
        "joinDate": body.joinDate,
        "karmaPoints": body.karmaPoints,
        "isPremium": body.isPremium,
        "favoriteGenres": body.favoriteGenres,
    })
    record = result.single()
    return _node_to_dict(record)


# ── 2. Create node with multiple labels ──────────────────────────

@router.post("/multi-label")
def create_user_multi_label(body: MultiLabelCreate, session: Session = Depends(get_session)):
    if not body.labels:
        raise HTTPException(status_code=400, detail="At least one label is required")
    for label in body.labels:
        if label not in ALLOWED_LABELS:
            raise HTTPException(status_code=400, detail=f"Label '{label}' is not allowed. Allowed: {ALLOWED_LABELS}")

    uid = str(uuid.uuid4())
    labels_str = ":".join(body.labels)
    props = {**body.properties, "id": uid}

    prop_keys = []
    params = {}
    for key, value in props.items():
        if key == "joinDate":
            prop_keys.append(f"{key}: date(${key})")
        else:
            prop_keys.append(f"{key}: ${key}")
        params[key] = value

    props_str = ", ".join(prop_keys)
    query = f"CREATE (n:{labels_str} {{{props_str}}}) RETURN n"
    result = session.run(query, params)
    record = result.single()
    return _node_to_dict(record)


# ── 3. Search nodes ──────────────────────────────────────────────

@router.get("/search")
def search_users(
    username: Optional[str] = Query(None),
    isPremium: Optional[bool] = Query(None),
    karmaPoints: Optional[int] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(25, ge=1, le=100),
    session: Session = Depends(get_session),
):
    filters = {}
    if username is not None:
        filters["username"] = username
    if isPremium is not None:
        filters["isPremium"] = isPremium
    if karmaPoints is not None:
        filters["karmaPoints"] = karmaPoints

    where, params = _build_where(filters)
    query = f"MATCH (n:User) {where} RETURN n ORDER BY n.username SKIP $skip LIMIT $limit"
    params["skip"] = skip
    params["limit"] = limit
    result = session.run(query, params)
    return [_node_to_dict(r) for r in result]


# ── 4. Aggregate ─────────────────────────────────────────────────

@router.get("/aggregate")
def aggregate_users(
    field: Optional[str] = Query(None, description="Field to aggregate: karmaPoints"),
    session: Session = Depends(get_session),
):
    if field and field not in AGGREGATE_FIELDS:
        raise HTTPException(status_code=400, detail=f"Cannot aggregate on '{field}'. Allowed: {AGGREGATE_FIELDS}")

    if field:
        query = (
            f"MATCH (n:User) RETURN count(n) AS count, "
            f"avg(n.{field}) AS avg_{field}, sum(n.{field}) AS sum_{field}"
        )
    else:
        query = "MATCH (n:User) RETURN count(n) AS count"

    result = session.run(query)
    record = result.single()
    return dict(record)


# ── 5. Get one node by id ────────────────────────────────────────

@router.get("/{node_id}")
def get_user(node_id: str, session: Session = Depends(get_session)):
    result = session.run("MATCH (n:User {id: $id}) RETURN n", {"id": node_id})
    record = result.single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")
    return _node_to_dict(record)


# ── 6. Update properties on one node ────────────────────────────

@router.patch("/{node_id}/properties")
def update_user_properties(node_id: str, body: PropertiesUpdate, session: Session = Depends(get_session)):
    set_parts = []
    params = {"id": node_id}
    for i, (key, value) in enumerate(body.properties.items()):
        p = f"p{i}"
        if key in ("joinDate",):
            set_parts.append(f"n.{key} = date(${p})")
        else:
            set_parts.append(f"n.{key} = ${p}")
        params[p] = value

    set_clause = ", ".join(set_parts)
    query = f"MATCH (n:User {{id: $id}}) SET {set_clause} RETURN n"
    result = session.run(query, params)
    record = result.single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")
    return _node_to_dict(record)


# ── 7. Batch update properties ───────────────────────────────────

@router.patch("/properties/batch")
def batch_update_user_properties(body: BatchPropertyUpdate, session: Session = Depends(get_session)):
    where, params = _build_where(body.filter)

    set_parts = []
    for i, (key, value) in enumerate(body.properties.items()):
        p = f"s{i}"
        if key in ("joinDate",):
            set_parts.append(f"n.{key} = date(${p})")
        else:
            set_parts.append(f"n.{key} = ${p}")
        params[p] = value

    set_clause = ", ".join(set_parts)
    query = f"MATCH (n:User) {where} SET {set_clause} RETURN n"
    result = session.run(query, params)
    return [_node_to_dict(r) for r in result]


# ── 8. Remove properties from one node ──────────────────────────

@router.delete("/{node_id}/properties")
def delete_user_properties(node_id: str, body: PropertyNamesDelete, session: Session = Depends(get_session)):
    remove_parts = [f"n.{name}" for name in body.property_names]
    remove_clause = ", ".join(remove_parts)
    query = f"MATCH (n:User {{id: $id}}) REMOVE {remove_clause} RETURN n"
    result = session.run(query, {"id": node_id})
    record = result.single()
    if not record:
        raise HTTPException(status_code=404, detail="User not found")
    return _node_to_dict(record)


# ── 9. Batch remove properties ───────────────────────────────────

@router.delete("/properties/batch")
def batch_delete_user_properties(body: BatchPropertyDelete, session: Session = Depends(get_session)):
    where, params = _build_where(body.filter)
    remove_parts = [f"n.{name}" for name in body.property_names]
    remove_clause = ", ".join(remove_parts)
    query = f"MATCH (n:User) {where} REMOVE {remove_clause} RETURN n"
    result = session.run(query, params)
    return [_node_to_dict(r) for r in result]


# ── 10. Delete one node ──────────────────────────────────────────

@router.delete("/{node_id}")
def delete_user(node_id: str, session: Session = Depends(get_session)):
    result = session.run("MATCH (n:User {id: $id}) DETACH DELETE n RETURN count(n) AS deleted", {"id": node_id})
    record = result.single()
    if record["deleted"] == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"deleted": True}


# ── 11. Batch delete nodes ───────────────────────────────────────

@router.delete("/batch")
def batch_delete_users(body: BatchDelete, session: Session = Depends(get_session)):
    where, params = _build_where(body.filter)
    query = f"MATCH (n:User) {where} DETACH DELETE n RETURN count(n) AS deleted"
    result = session.run(query, params)
    record = result.single()
    return {"deleted": record["deleted"]}
