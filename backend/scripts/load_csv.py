import csv
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from db import get_driver

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def read_csv(filename):
    filepath = os.path.join(DATA_DIR, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        return list(reader)


def batch_run(session, query, rows, batch_size=500):
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        result = session.run(query, batch=batch)
        count = result.single()["count"]
        total += count
    return total


def create_indexes(session):
    labels = ["User", "Post", "Community", "Game", "Tag", "Award"]
    for label in labels:
        session.run(f"CREATE INDEX IF NOT EXISTS FOR (n:{label}) ON (n.id)")
        print(f"  Index on {label}.id created")


def load_games(session):
    rows = read_csv("games.csv")
    parsed = []
    for r in rows:
        parsed.append({
            "id": r["id"],
            "title": r["title"],
            "releaseDate": r.get("releaseDate", "2020-01-01"),
            "metacriticScore": float(r.get("metacriticScore", 0)),
            "isMultiplayer": r.get("isMultiplayer", "false").lower() == "true",
            "platforms": r.get("platforms", "").split(";") if r.get("platforms") else [],
        })
    query = """
    UNWIND $batch AS row
    CREATE (n:Game {
        id: row.id,
        title: row.title,
        releaseDate: date(row.releaseDate),
        metacriticScore: row.metacriticScore,
        isMultiplayer: row.isMultiplayer,
        platforms: row.platforms
    })
    RETURN count(n) AS count
    """
    count = batch_run(session, query, parsed)
    print(f"  Loaded {count} Game nodes")


def load_users(session):
    rows = read_csv("users.csv")
    parsed = []
    for r in rows:
        parsed.append({
            "id": r["id"],
            "username": r["username"],
            "joinDate": r.get("joinDate", "2024-01-01"),
            "karmaPoints": int(r.get("karmaPoints", 0)),
            "isPremium": r.get("isPremium", "false").lower() == "true",
            "favoriteGenres": r.get("favoriteGenres", "").split(";") if r.get("favoriteGenres") else [],
        })
    query = """
    UNWIND $batch AS row
    CREATE (n:User {
        id: row.id,
        username: row.username,
        joinDate: date(row.joinDate),
        karmaPoints: row.karmaPoints,
        isPremium: row.isPremium,
        favoriteGenres: row.favoriteGenres
    })
    RETURN count(n) AS count
    """
    count = batch_run(session, query, parsed)
    print(f"  Loaded {count} User nodes")


def load_communities(session):
    rows = read_csv("communities.csv")
    parsed = []
    for r in rows:
        parsed.append({
            "id": r["id"],
            "name": r["name"],
            "createdDate": r.get("createdDate", "2024-01-01"),
            "memberCount": int(r.get("memberCount", 0)),
            "isNSFW": r.get("isNSFW", "false").lower() == "true",
            "rules": r.get("rules", "").split(";") if r.get("rules") else [],
        })
    query = """
    UNWIND $batch AS row
    CREATE (n:Community {
        id: row.id,
        name: row.name,
        createdDate: date(row.createdDate),
        memberCount: row.memberCount,
        isNSFW: row.isNSFW,
        rules: row.rules
    })
    RETURN count(n) AS count
    """
    count = batch_run(session, query, parsed)
    print(f"  Loaded {count} Community nodes")


def load_posts(session):
    rows = read_csv("posts.csv")
    parsed = []
    for r in rows:
        parsed.append({
            "id": r["id"],
            "title": r["title"],
            "body": r["body"],
            "createdAt": r.get("createdAt", "2024-01-01"),
            "upvotes": int(r.get("upvotes", 0)),
            "isPinned": r.get("isPinned", "false").lower() == "true",
            "flairs": r.get("flairs", "").split(";") if r.get("flairs") else [],
        })
    query = """
    UNWIND $batch AS row
    CREATE (n:Post {
        id: row.id,
        title: row.title,
        body: row.body,
        createdAt: date(row.createdAt),
        upvotes: row.upvotes,
        isPinned: row.isPinned,
        flairs: row.flairs
    })
    RETURN count(n) AS count
    """
    count = batch_run(session, query, parsed)
    print(f"  Loaded {count} Post nodes")


def load_tags(session):
    rows = read_csv("tags.csv")
    parsed = []
    for r in rows:
        parsed.append({
            "id": r["id"],
            "name": r["name"],
            "createdAt": r.get("createdAt", "2024-01-01"),
            "usageCount": int(r.get("usageCount", 0)),
            "isOfficial": r.get("isOfficial", "false").lower() == "true",
            "relatedTags": r.get("relatedTags", "").split(";") if r.get("relatedTags") else [],
        })
    query = """
    UNWIND $batch AS row
    CREATE (n:Tag {
        id: row.id,
        name: row.name,
        createdAt: date(row.createdAt),
        usageCount: row.usageCount,
        isOfficial: row.isOfficial,
        relatedTags: row.relatedTags
    })
    RETURN count(n) AS count
    """
    count = batch_run(session, query, parsed)
    print(f"  Loaded {count} Tag nodes")


def load_awards(session):
    rows = read_csv("awards.csv")
    parsed = []
    for r in rows:
        parsed.append({
            "id": r["id"],
            "name": r["name"],
            "grantedAt": r.get("grantedAt", "2024-01-01"),
            "coinCost": int(r.get("coinCost", 0)),
            "isRare": r.get("isRare", "false").lower() == "true",
            "description": r.get("description", ""),
        })
    query = """
    UNWIND $batch AS row
    CREATE (n:Award {
        id: row.id,
        name: row.name,
        grantedAt: date(row.grantedAt),
        coinCost: row.coinCost,
        isRare: row.isRare,
        description: row.description
    })
    RETURN count(n) AS count
    """
    count = batch_run(session, query, parsed)
    print(f"  Loaded {count} Award nodes")


def load_relationship(session, filename, from_label, to_label, rel_type, from_key, to_key, props_config):
    rows = read_csv(filename)
    if not rows:
        print(f"  Skipping {filename} (empty)")
        return

    parsed = []
    for r in rows:
        item = {from_key: r[from_key], to_key: r[to_key]}
        for prop_name, prop_type in props_config.items():
            val = r.get(prop_name, "")
            if not val:
                continue
            if prop_type == "int":
                item[prop_name] = int(val)
            elif prop_type == "float":
                item[prop_name] = float(val)
            elif prop_type == "bool":
                item[prop_name] = val.lower() == "true"
            else:
                item[prop_name] = val
        parsed.append(item)

    set_parts = []
    for prop_name, prop_type in props_config.items():
        if prop_type == "date":
            set_parts.append(f"r.{prop_name} = CASE WHEN row.{prop_name} IS NOT NULL AND row.{prop_name} <> '' THEN date(row.{prop_name}) ELSE null END")
        else:
            set_parts.append(f"r.{prop_name} = row.{prop_name}")

    set_clause = ", ".join(set_parts) if set_parts else ""
    set_line = f"SET {set_clause}" if set_clause else ""

    query = f"""
    UNWIND $batch AS row
    MATCH (a:{from_label} {{id: row.{from_key}}}), (b:{to_label} {{id: row.{to_key}}})
    CREATE (a)-[r:{rel_type}]->(b)
    {set_line}
    RETURN count(r) AS count
    """
    count = batch_run(session, query, parsed)
    print(f"  Loaded {count} {rel_type} relationships from {filename}")


def load_all_relationships(session):
    rels = [
        ("member_of.csv", "User", "Community", "MEMBER_OF", "user_id", "community_id",
         {"joinedAt": "date", "role": "str", "isActive": "bool"}),
        ("wrote.csv", "User", "Post", "WROTE", "user_id", "post_id",
         {"postedAt": "date", "isEdited": "bool", "editedAt": "date"}),
        ("posted_in.csv", "Post", "Community", "POSTED_IN", "post_id", "community_id",
         {"postedAt": "date", "isPinned": "bool", "approvedBy": "str"}),
        ("upvoted.csv", "User", "Post", "UPVOTED", "user_id", "post_id",
         {"votedAt": "date", "value": "int", "fromCommunity": "str"}),
        ("commented_on.csv", "User", "Post", "COMMENTED_ON", "user_id", "post_id",
         {"commentedAt": "date", "upvotes": "int", "isDeleted": "bool"}),
        ("follows.csv", "User", "User", "FOLLOWS", "from_user_id", "to_user_id",
         {"followedAt": "date", "notificationsOn": "bool", "mutualFollow": "bool"}),
        ("about.csv", "Post", "Game", "ABOUT", "post_id", "game_id",
         {"relevanceScore": "float", "containsSpoiler": "bool", "taggedAt": "date"}),
        ("tagged_with.csv", "Post", "Tag", "TAGGED_WITH", "post_id", "tag_id",
         {"taggedAt": "date", "taggedBy": "str", "isAutoTagged": "bool"}),
        ("related_to.csv", "Community", "Game", "RELATED_TO", "community_id", "game_id",
         {"strength": "float", "linkedAt": "date", "isPrimary": "bool"}),
        ("received_award.csv", "Post", "Award", "RECEIVED_AWARD", "post_id", "award_id",
         {"awardedAt": "date", "awardedBy": "str", "message": "str"}),
        ("crossposted_to.csv", "Post", "Community", "CROSSPOSTED_TO", "post_id", "community_id",
         {"crosspostedAt": "date", "originalPostId": "str", "approved": "bool"}),
    ]

    for args in rels:
        filename = args[0]
        filepath = os.path.join(DATA_DIR, filename)
        if os.path.exists(filepath):
            load_relationship(session, *args)
        else:
            print(f"  Skipping {filename} (not found)")


def main():
    driver = get_driver()

    with driver.session() as session:
        print("Creating indexes...")
        create_indexes(session)

    print("\nLoading nodes...")
    with driver.session() as session:
        load_games(session)
    with driver.session() as session:
        load_users(session)
    with driver.session() as session:
        load_communities(session)
    with driver.session() as session:
        load_posts(session)
    with driver.session() as session:
        load_tags(session)
    with driver.session() as session:
        load_awards(session)

    print("\nLoading relationships...")
    with driver.session() as session:
        load_all_relationships(session)

    print("\nVerifying data...")
    with driver.session() as session:
        result = session.run("MATCH (n) RETURN labels(n)[0] AS label, count(n) AS count ORDER BY label")
        for record in result:
            print(f"  {record['label']}: {record['count']}")

        result = session.run("MATCH ()-[r]->() RETURN type(r) AS type, count(r) AS count ORDER BY type")
        for record in result:
            print(f"  {record['type']}: {record['count']}")

        result = session.run("MATCH (n) WHERE NOT (n)--() RETURN count(n) AS isolated")
        isolated = result.single()["isolated"]
        print(f"\n  Isolated nodes: {isolated}")
        if isolated > 0:
            print("  WARNING: Graph is not fully connected!")
        else:
            print("  Graph connectivity verified!")

    driver.close()
    print("\nDone!")


if __name__ == "__main__":
    main()
