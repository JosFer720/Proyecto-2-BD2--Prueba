from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from neo4j import Session
from db import get_session
import csv
import io

router = APIRouter(prefix="/api/csv", tags=["CSV Upload"])

ALLOWED_NODE_LABELS = {"User", "Post", "Community", "Game", "Tag", "Award"}
ALLOWED_REL_TYPES = {
    "MEMBER_OF", "WROTE", "POSTED_IN", "UPVOTED", "COMMENTED_ON",
    "FOLLOWS", "ABOUT", "TAGGED_WITH", "RELATED_TO", "RECEIVED_AWARD", "CROSSPOSTED_TO"
}

DATE_FIELDS = {
    "joinDate", "createdDate", "createdAt", "releaseDate", "grantedAt",
    "joinedAt", "postedAt", "editedAt", "votedAt", "commentedAt",
    "followedAt", "taggedAt", "linkedAt", "awardedAt", "crosspostedAt",
}

BOOL_FIELDS = {
    "isPremium", "isNSFW", "isPinned", "isMultiplayer", "isOfficial", "isRare",
    "isActive", "isEdited", "isDeleted", "notificationsOn", "mutualFollow",
    "containsSpoiler", "isAutoTagged", "isPrimary", "approved",
}

INT_FIELDS = {
    "karmaPoints", "memberCount", "upvotes", "usageCount", "coinCost", "value",
}

FLOAT_FIELDS = {
    "metacriticScore", "relevanceScore", "strength",
}

LIST_FIELDS = {
    "favoriteGenres", "rules", "flairs", "platforms", "relatedTags",
}


def parse_value(key: str, value: str):
    if not value or value.strip() == "":
        return None
    value = value.strip()
    if key in BOOL_FIELDS:
        return value.lower() in ("true", "1", "yes")
    if key in INT_FIELDS:
        return int(value)
    if key in FLOAT_FIELDS:
        return float(value)
    if key in LIST_FIELDS:
        return value.split(";") if ";" in value else [value]
    return value


def build_set_clause(headers, prefix="row"):
    parts = []
    for h in headers:
        if h in DATE_FIELDS:
            parts.append(f"n.{h} = date({prefix}.{h})")
        else:
            parts.append(f"n.{h} = {prefix}.{h}")
    return ", ".join(parts)


@router.post("/upload/nodes")
def upload_nodes(
    file: UploadFile = File(...),
    label: str = Form(...),
    session: Session = Depends(get_session),
):
    if label not in ALLOWED_NODE_LABELS:
        raise HTTPException(400, f"Invalid label: {label}. Allowed: {ALLOWED_NODE_LABELS}")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)

    if not rows:
        raise HTTPException(400, "CSV file is empty")

    headers = list(rows[0].keys())
    parsed_rows = []
    for row in rows:
        parsed = {}
        for key in headers:
            val = parse_value(key, row.get(key, ""))
            if val is not None:
                parsed[key] = val
        parsed_rows.append(parsed)

    batch_size = 500
    total_created = 0

    for i in range(0, len(parsed_rows), batch_size):
        batch = parsed_rows[i : i + batch_size]

        set_parts = []
        for h in headers:
            if h in DATE_FIELDS:
                set_parts.append(f"n.{h} = date(row.{h})")
            else:
                set_parts.append(f"n.{h} = row.{h}")

        query = f"""
        UNWIND $batch AS row
        CREATE (n:{label})
        SET {', '.join(set_parts)}
        RETURN count(n) AS created
        """
        result = session.run(query, batch=batch)
        total_created += result.single()["created"]

    return {"message": f"Created {total_created} {label} nodes", "count": total_created}


@router.post("/upload/relationships")
def upload_relationships(
    file: UploadFile = File(...),
    rel_type: str = Form(...),
    from_label: str = Form(...),
    to_label: str = Form(...),
    from_key: str = Form("from_id"),
    to_key: str = Form("to_id"),
    session: Session = Depends(get_session),
):
    if rel_type not in ALLOWED_REL_TYPES:
        raise HTTPException(400, f"Invalid relationship type: {rel_type}")
    if from_label not in ALLOWED_NODE_LABELS:
        raise HTTPException(400, f"Invalid from_label: {from_label}")
    if to_label not in ALLOWED_NODE_LABELS:
        raise HTTPException(400, f"Invalid to_label: {to_label}")

    content = file.file.read().decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))
    rows = list(reader)

    if not rows:
        raise HTTPException(400, "CSV file is empty")

    headers = [h for h in rows[0].keys() if h not in (from_key, to_key)]

    parsed_rows = []
    for row in rows:
        parsed = {from_key: row[from_key], to_key: row[to_key]}
        for key in headers:
            val = parse_value(key, row.get(key, ""))
            if val is not None:
                parsed[key] = val
        parsed_rows.append(parsed)

    batch_size = 500
    total_created = 0

    for i in range(0, len(parsed_rows), batch_size):
        batch = parsed_rows[i : i + batch_size]

        set_parts = []
        for h in headers:
            if h in DATE_FIELDS:
                set_parts.append(f"r.{h} = date(row.{h})")
            else:
                set_parts.append(f"r.{h} = row.{h}")

        set_clause = f"SET {', '.join(set_parts)}" if set_parts else ""

        query = f"""
        UNWIND $batch AS row
        MATCH (a:{from_label} {{id: row.{from_key}}}), (b:{to_label} {{id: row.{to_key}}})
        CREATE (a)-[r:{rel_type}]->(b)
        {set_clause}
        RETURN count(r) AS created
        """
        result = session.run(query, batch=batch)
        total_created += result.single()["created"]

    return {"message": f"Created {total_created} {rel_type} relationships", "count": total_created}
