from fastapi import APIRouter, Depends, HTTPException
from neo4j import Session

from db import get_session
from serializers import serialize_value

router = APIRouter(prefix="/api/queries", tags=["Queries"])


@router.get("/top-posts-by-game")
def top_posts_by_game(
    user_id: str,
    game_id: str,
    session: Session = Depends(get_session),
):
    """Most voted posts about a game in communities where a specific user is a member."""
    query = """
    MATCH (u:User {id: $userId})-[:MEMBER_OF]->(c:Community)<-[:POSTED_IN]-(p:Post)-[:ABOUT]->(g:Game {id: $gameId}),
          (p)<-[:WROTE]-(author:User)
    RETURN p.id AS postId, p.title AS title, p.upvotes AS upvotes,
           c.name AS community, author.username AS author
    ORDER BY p.upvotes DESC
    LIMIT 10
    """
    try:
        result = session.run(query, {"userId": user_id, "gameId": game_id})
        return [{k: serialize_value(v) for k, v in rec.items()} for rec in result]
    except Exception as e:
        raise HTTPException(500, f"Query failed: {e}")


@router.get("/suggested-users")
def suggested_users(
    user_id: str,
    session: Session = Depends(get_session),
):
    """Users not followed but in shared communities."""
    query = """
    MATCH (u:User {id: $userId})-[:MEMBER_OF]->(c:Community)<-[:MEMBER_OF]-(other:User)
    WHERE NOT (u)-[:FOLLOWS]->(other) AND u <> other
    RETURN other.id AS userId, other.username AS username,
           count(c) AS sharedCommunities
    ORDER BY sharedCommunities DESC
    LIMIT 10
    """
    try:
        result = session.run(query, {"userId": user_id})
        return [{k: serialize_value(v) for k, v in rec.items()} for rec in result]
    except Exception as e:
        raise HTTPException(500, f"Query failed: {e}")


@router.get("/active-communities")
def active_communities(session: Session = Depends(get_session)):
    """Most active communities by post count in the last 30 days."""
    query = """
    MATCH (p:Post)-[r:POSTED_IN]->(c:Community)
    WHERE r.postedAt >= date() - duration('P30D')
    RETURN c.id AS communityId, c.name AS name,
           count(p) AS postCount, avg(p.upvotes) AS avgUpvotes
    ORDER BY postCount DESC
    LIMIT 10
    """
    try:
        result = session.run(query)
        return [{k: serialize_value(v) for k, v in rec.items()} for rec in result]
    except Exception as e:
        raise HTTPException(500, f"Query failed: {e}")


@router.get("/game-community-stats")
def game_community_stats(session: Session = Depends(get_session)):
    """Game with most communities and average karma of its users."""
    query = """
    MATCH (c:Community)-[:RELATED_TO]->(g:Game)
    OPTIONAL MATCH (u:User)-[:MEMBER_OF]->(c)
    RETURN g.id AS gameId, g.title AS title,
           count(DISTINCT c) AS communityCount, avg(u.karmaPoints) AS avgKarma
    ORDER BY communityCount DESC
    LIMIT 10
    """
    try:
        result = session.run(query)
        return [{k: serialize_value(v) for k, v in rec.items()} for rec in result]
    except Exception as e:
        raise HTTPException(500, f"Query failed: {e}")


@router.get("/shortest-path")
def shortest_path(
    user_a_id: str,
    user_b_id: str,
    session: Session = Depends(get_session),
):
    """Shortest path between two users via FOLLOWS relationships."""
    query = """
    MATCH path = shortestPath(
      (a:User {id: $userA})-[:FOLLOWS*..15]-(b:User {id: $userB})
    )
    RETURN [n IN nodes(path) | {id: n.id, username: n.username}] AS pathNodes,
           length(path) AS distance
    """
    try:
        result = session.run(query, {"userA": user_a_id, "userB": user_b_id})
        record = result.single()
        if record is None:
            raise HTTPException(404, "No path found between the two users")
        return dict(record)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Query failed: {e}")


@router.get("/rare-award-posts")
def rare_award_posts(session: Session = Depends(get_session)):
    """Posts with rare awards grouped by community."""
    query = """
    MATCH (p:Post)-[:RECEIVED_AWARD]->(a:Award {isRare: true}),
          (p)-[:POSTED_IN]->(c:Community)
    RETURN c.id AS communityId, c.name AS community,
           collect(DISTINCT p.title) AS posts, count(a) AS rareAwardCount
    ORDER BY rareAwardCount DESC
    LIMIT 10
    """
    try:
        result = session.run(query)
        return [{k: serialize_value(v) for k, v in rec.items()} for rec in result]
    except Exception as e:
        raise HTTPException(500, f"Query failed: {e}")
