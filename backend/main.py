from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import get_driver, close_driver

from routers import users, posts, communities, games, tags, awards, relationships, queries, graph, csv_upload, gds


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_driver()
    yield
    close_driver()


app = FastAPI(title="GGBoard API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(posts.router)
app.include_router(communities.router)
app.include_router(games.router)
app.include_router(tags.router)
app.include_router(awards.router)
app.include_router(relationships.router)
app.include_router(queries.router)
app.include_router(graph.router)
app.include_router(csv_upload.router)
app.include_router(gds.router)


@app.get("/api/health")
def health_check():
    driver = get_driver()
    with driver.session() as session:
        session.run("RETURN 1")
    return {"status": "ok", "database": "connected"}
