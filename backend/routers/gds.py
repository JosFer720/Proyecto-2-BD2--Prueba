from fastapi import APIRouter, Depends, HTTPException, Query
from neo4j import Session
from db import get_session
import networkx as nx
from networkx.algorithms.community import louvain_communities

router = APIRouter(prefix="/api/gds", tags=["GDS Algorithms"])


@router.get("/pagerank")
def pagerank(
    top: int = Query(20, ge=1, le=100),
    session: Session = Depends(get_session),
):
    query = """
    MATCH (a:User)-[:FOLLOWS]->(b:User)
    RETURN a.id AS source, b.id AS target, a.username AS sourceUser, b.username AS targetUser
    """
    try:
        result = session.run(query)
        records = list(result)

        if not records:
            return {"results": [], "message": "No FOLLOWS relationships found"}

        G = nx.DiGraph()
        usernames = {}
        for r in records:
            G.add_edge(r["source"], r["target"])
            usernames[r["source"]] = r["sourceUser"]
            usernames[r["target"]] = r["targetUser"]

        scores = nx.pagerank(G, alpha=0.85)

        ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)[:top]

        return {
            "results": [
                {
                    "userId": uid,
                    "username": usernames.get(uid, uid),
                    "pageRankScore": round(score, 6),
                    "rank": i + 1,
                }
                for i, (uid, score) in enumerate(ranked)
            ],
            "totalNodes": G.number_of_nodes(),
            "totalEdges": G.number_of_edges(),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/louvain")
def louvain_detection(
    session: Session = Depends(get_session),
):
    query = """
    MATCH (u:User)-[:MEMBER_OF]->(c:Community)
    RETURN u.id AS userId, u.username AS username, c.id AS communityId, c.name AS communityName
    """
    try:
        result = session.run(query)
        records = list(result)

        if not records:
            return {"communities": [], "message": "No user-community relationships found"}

        G = nx.Graph()
        user_info = {}
        community_info = {}

        for r in records:
            user_node = f"user_{r['userId']}"
            comm_node = f"comm_{r['communityId']}"
            G.add_edge(user_node, comm_node)
            user_info[user_node] = {"id": r["userId"], "username": r["username"]}
            community_info[comm_node] = {"id": r["communityId"], "name": r["communityName"]}

        communities = louvain_communities(G, seed=42)

        clusters = []
        for i, community in enumerate(sorted(communities, key=len, reverse=True)):
            users_in = []
            comms_in = []
            for node in community:
                if node.startswith("user_") and node in user_info:
                    users_in.append(user_info[node])
                elif node.startswith("comm_") and node in community_info:
                    comms_in.append(community_info[node])
            clusters.append({
                "clusterId": i,
                "size": len(community),
                "users": users_in[:50],
                "communities": comms_in,
                "userCount": len(users_in),
                "communityCount": len(comms_in),
            })

        return {
            "clusters": clusters[:20],
            "totalClusters": len(communities),
            "totalNodes": G.number_of_nodes(),
        }
    except Exception as e:
        raise HTTPException(500, str(e))


@router.get("/shortest-path")
def shortest_path(
    user_a: str = Query(...),
    user_b: str = Query(...),
    session: Session = Depends(get_session),
):
    query = """
    MATCH path = shortestPath(
        (a:User {id: $userA})-[:FOLLOWS*..15]-(b:User {id: $userB})
    )
    RETURN [n IN nodes(path) | {id: n.id, username: n.username}] AS pathNodes,
           length(path) AS distance
    """
    try:
        result = session.run(query, userA=user_a, userB=user_b)
        record = result.single()

        if not record:
            return {
                "found": False,
                "message": "No path found between the two users",
                "pathNodes": [],
                "distance": -1,
            }

        return {
            "found": True,
            "pathNodes": record["pathNodes"],
            "distance": record["distance"],
        }
    except Exception as e:
        raise HTTPException(500, str(e))
