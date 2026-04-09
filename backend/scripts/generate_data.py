"""
GGBoard Data Generation Script
Generates CSV files for seeding a Neo4j graph database.
Fetches ~500 real games from RAWG API and generates synthetic data with Faker.
"""

import csv
import os
import random
import uuid
from datetime import timedelta

import requests
from dotenv import load_dotenv
from faker import Faker

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(SCRIPT_DIR, "..", "..", ".env")
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")

load_dotenv(dotenv_path=ENV_PATH)
RAWG_API_KEY = os.getenv("RAWG_API_KEY")

random.seed(42)
fake = Faker()
Faker.seed(42)

# Ensure output directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Constants / Preset Lists
# ---------------------------------------------------------------------------

GENRES = [
    "Action", "RPG", "Adventure", "Strategy", "Shooter", "Puzzle",
    "Racing", "Sports", "Simulation", "Horror", "Fighting", "Platformer",
]

COMMUNITY_SUFFIXES = [
    "Hub", "Zone", "Arena", "Guild", "Realm", "Lounge",
    "Den", "Forge", "Tavern", "Nexus", "Outpost", "Citadel",
]

COMMUNITY_THEMES = [
    "Action", "RPG", "Adventure", "Strategy", "Shooter", "Puzzle",
    "Racing", "Sports", "Simulation", "Horror", "Fighting", "Platformer",
    "Indie", "Retro", "Speedrun", "Esports", "Lore", "Modding",
    "Casual", "Hardcore", "Chill", "Competitive", "Creative", "Sandbox",
    "Survival", "MMO", "FPS", "Battle Royale", "Open World", "Stealth",
    "Roguelike", "Metroidvania", "Souls", "Tactical", "Co-op", "PvP",
    "Streaming", "Cosplay", "Fan Art", "Soundtrack", "VR", "Mobile",
    "PC Master", "Console", "Nintendo", "PlayStation", "Xbox", "Steam",
    "Epic", "Deals", "Reviews",
]

RULES_POOL = [
    "Be respectful",
    "No spoilers",
    "English only",
    "No self-promotion",
    "Tag NSFW content",
    "No low-effort posts",
    "Stay on topic",
    "No hate speech",
    "Credit original creators",
    "Use appropriate flairs",
]

FLAIRS = [
    "Discussion", "Question", "News", "Meme", "Guide",
    "Review", "Bug Report", "Fan Art", "Clip", "Suggestion",
]

TAG_NAMES = [
    "fps", "open-world", "rpg", "indie", "multiplayer", "co-op",
    "battle-royale", "mmorpg", "sandbox", "roguelike", "metroidvania",
    "souls-like", "survival", "horror", "puzzle", "racing", "fighting",
    "stealth", "turn-based", "real-time-strategy", "tower-defense",
    "hack-and-slash", "dungeon-crawler", "city-builder", "farming-sim",
    "visual-novel", "point-and-click", "platformer", "shooter",
    "action-adventure", "jrpg", "western-rpg", "crpg", "tactical-rpg",
    "moba", "card-game", "board-game", "party-game", "rhythm",
    "sports", "simulation", "management", "tycoon", "space",
    "sci-fi", "fantasy", "cyberpunk", "post-apocalyptic", "medieval",
    "historical", "military", "war", "pirate", "ninja",
    "zombie", "vampire", "detective", "mystery", "narrative",
    "story-rich", "choices-matter", "emotional", "relaxing", "difficult",
    "casual", "hardcore", "competitive", "esports", "speedrun",
    "modding", "early-access", "free-to-play", "pay-to-win", "loot-boxes",
    "battle-pass", "seasonal", "live-service", "single-player",
    "local-multiplayer", "online-multiplayer", "cross-platform",
    "vr", "ar", "motion-control", "keyboard-mouse", "controller",
    "pixel-art", "retro", "2d", "3d", "isometric",
    "top-down", "side-scroller", "first-person", "third-person",
    "open-ended", "linear", "procedural", "crafting", "base-building",
    "exploration", "photography", "cooking", "fishing", "pets",
    "vehicles", "mechs", "dragons", "magic", "guns",
    "swords", "bows", "steampunk", "lovecraftian", "anime",
]

AWARD_DEFINITIONS = [
    ("Gold Star", "Outstanding contribution to the community", 1000),
    ("Silver Medal", "Great post that deserves recognition", 500),
    ("Helpful Award", "This post helped someone out", 100),
    ("Wholesome", "Pure wholesome content", 200),
    ("Mind Blown", "This post blew my mind", 500),
    ("Take My Energy", "Sending positive vibes", 50),
    ("Platinum Trophy", "The rarest and most prestigious award", 5000),
    ("Game Changer", "A post that changed the game", 2000),
    ("MVP", "Most Valuable Poster", 1000),
    ("Legend", "Legendary status achieved", 5000),
    ("Pro Gamer Move", "A truly pro gamer move", 500),
    ("Big Brain", "Intellectual content of the highest order", 200),
    ("GG", "Good game, well played", 50),
    ("Clutch", "Came through when it mattered most", 200),
    ("Speedrunner", "Fast and efficient content", 100),
    ("Easter Egg", "Hidden gem of a post", 500),
    ("Pixel Perfect", "Attention to detail is immaculate", 200),
    ("Lore Master", "Deep knowledge of game lore", 1000),
    ("Bug Hunter", "Found and reported a bug", 100),
    ("Community Hero", "Goes above and beyond for the community", 2000),
    ("First Blood", "First to post something noteworthy", 50),
    ("Combo Breaker", "Broke the chain in the best way", 100),
    ("Critical Hit", "This post hit different", 200),
    ("Power Up", "Energizing the community", 100),
    ("Boss Defeated", "Overcame a major challenge", 500),
    ("Secret Achievement", "Unlocked something unexpected", 1000),
    ("Noob Friendly", "Great for newcomers", 50),
    ("Veteran", "Wisdom from experience", 200),
    ("Streamer Approved", "Content worthy of a stream", 500),
    ("Mod Pick", "Selected by the moderators", 100),
    ("Fan Favorite", "Loved by the community", 200),
    ("Trailblazer", "First to explore new territory", 1000),
    ("Night Owl", "Quality late-night content", 50),
    ("Early Bird", "First to the scene", 50),
    ("Team Player", "Great collaborative spirit", 100),
    ("Solo Legend", "Impressive solo achievement", 500),
    ("Rage Quit", "Hilariously frustrating content", 50),
    ("Respawn", "Back with even better content", 100),
    ("Save Point", "A post worth bookmarking", 200),
    ("Final Boss", "The ultimate post", 2000),
    ("Treasure Chest", "Full of valuable information", 500),
    ("Side Quest", "Interesting tangent worth exploring", 100),
    ("Main Quest", "Core content that drives discussion", 200),
    ("DLC Worthy", "Could be its own expansion", 1000),
    ("Patch Notes", "Important updates and changes", 100),
    ("Achievement Unlocked", "Did something remarkable", 500),
    ("Inventory Full", "So much good content", 200),
    ("Checkpoint", "A milestone post", 100),
    ("New Game Plus", "Taking things to the next level", 2000),
    ("Prestige", "Reached the highest tier", 5000),
]

COIN_COSTS = [50, 100, 200, 500, 1000, 2000, 5000]

# ---------------------------------------------------------------------------
# Helper Utilities
# ---------------------------------------------------------------------------


def csv_path(filename: str) -> str:
    return os.path.join(DATA_DIR, filename)


def write_csv(filename: str, headers: list, rows: list):
    path = csv_path(filename)
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(headers)
        writer.writerows(rows)
    print(f"  -> {filename}: {len(rows)} rows written")


def semi_join(items):
    """Join list items with semicolons for CSV fields."""
    return ";".join(str(i) for i in items)


# ---------------------------------------------------------------------------
# 1. Fetch Games from RAWG API
# ---------------------------------------------------------------------------


def fetch_games() -> list[dict]:
    """Fetch ~500 games from the RAWG API (13 pages x 40 per page)."""
    if not RAWG_API_KEY:
        raise RuntimeError("RAWG_API_KEY not found in environment. Check your .env file.")

    games = []
    base_url = "https://api.rawg.io/api/games"

    for page in range(1, 14):
        print(f"  Fetching RAWG page {page}/13 ...")
        try:
            resp = requests.get(
                base_url,
                params={"key": RAWG_API_KEY, "page": page, "page_size": 40},
                timeout=30,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.RequestException as e:
            print(f"    WARNING: Failed to fetch page {page}: {e}")
            continue

        for g in data.get("results", []):
            tags = [t["name"] for t in (g.get("tags") or [])]
            is_multi = any(
                kw in tag.lower() for tag in tags for kw in ("multiplayer", "online")
            )
            platforms = [
                p["platform"]["name"]
                for p in (g.get("platforms") or [])
                if p.get("platform")
            ]

            games.append({
                "id": str(g["id"]),
                "title": g.get("name", "Unknown"),
                "releaseDate": g.get("released") or "2020-01-01",
                "metacriticScore": float(g.get("metacritic") or 0.0),
                "isMultiplayer": is_multi,
                "platforms": semi_join(platforms),
            })

    print(f"  Total games fetched: {len(games)}")
    return games


# ---------------------------------------------------------------------------
# 2. Generate Node CSVs
# ---------------------------------------------------------------------------


def generate_games_csv(games: list[dict]):
    headers = ["id", "title", "releaseDate", "metacriticScore", "isMultiplayer", "platforms"]
    rows = [
        [g["id"], g["title"], g["releaseDate"], g["metacriticScore"], g["isMultiplayer"], g["platforms"]]
        for g in games
    ]
    write_csv("games.csv", headers, rows)


def generate_users(n: int = 2000) -> list[dict]:
    seen = set()
    users = []
    for _ in range(n):
        base = fake.user_name()
        username = f"{base}_{random.randint(100, 9999)}"
        while username in seen:
            username = f"{base}_{random.randint(100, 9999)}"
        seen.add(username)
        users.append({
            "id": str(uuid.uuid4()),
            "username": username,
            "joinDate": fake.date_between("-3y", "today").isoformat(),
            "karmaPoints": random.randint(0, 50000),
            "isPremium": random.random() < 0.20,
            "favoriteGenres": semi_join(random.sample(GENRES, random.randint(1, 4))),
        })
    headers = ["id", "username", "joinDate", "karmaPoints", "isPremium", "favoriteGenres"]
    rows = [[u[h] for h in headers] for u in users]
    write_csv("users.csv", headers, rows)
    return users


def generate_communities(n: int = 100) -> list[dict]:
    used_names = set()
    communities = []
    for _ in range(n):
        theme = random.choice(COMMUNITY_THEMES)
        suffix = random.choice(COMMUNITY_SUFFIXES)
        name = f"{theme} {suffix}"
        while name in used_names:
            theme = random.choice(COMMUNITY_THEMES)
            suffix = random.choice(COMMUNITY_SUFFIXES)
            name = f"{theme} {suffix}"
        used_names.add(name)
        communities.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "createdDate": fake.date_between("-2y", "today").isoformat(),
            "memberCount": random.randint(50, 10000),
            "isNSFW": random.random() < 0.05,
            "rules": semi_join(random.sample(RULES_POOL, random.randint(2, 4))),
        })
    headers = ["id", "name", "createdDate", "memberCount", "isNSFW", "rules"]
    rows = [[c[h] for h in headers] for c in communities]
    write_csv("communities.csv", headers, rows)
    return communities


def generate_posts(n: int = 2000) -> list[dict]:
    posts = []
    for _ in range(n):
        posts.append({
            "id": str(uuid.uuid4()),
            "title": fake.sentence(nb_words=random.randint(4, 10)),
            "body": fake.paragraph(nb_sentences=random.randint(2, 6)),
            "createdAt": fake.date_between("-1y", "today").isoformat(),
            "upvotes": random.randint(0, 5000),
            "isPinned": random.random() < 0.03,
            "flairs": semi_join(random.sample(FLAIRS, random.randint(0, 3))),
        })
    headers = ["id", "title", "body", "createdAt", "upvotes", "isPinned", "flairs"]
    rows = [[p[h] for h in headers] for p in posts]
    write_csv("posts.csv", headers, rows)
    return posts


def generate_tags() -> list[dict]:
    tags = []
    names_copy = list(TAG_NAMES)
    for name in names_copy:
        others = [t for t in names_copy if t != name]
        tags.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "createdAt": fake.date_between("-2y", "today").isoformat(),
            "usageCount": random.randint(10, 10000),
            "isOfficial": random.random() < 0.40,
            "relatedTags": semi_join(random.sample(others, random.randint(1, 3))),
        })
    headers = ["id", "name", "createdAt", "usageCount", "isOfficial", "relatedTags"]
    rows = [[t[h] for h in headers] for t in tags]
    write_csv("tags.csv", headers, rows)
    return tags


def generate_awards() -> list[dict]:
    awards = []
    for name, desc, default_cost in AWARD_DEFINITIONS[:50]:
        cost = random.choice(COIN_COSTS)
        awards.append({
            "id": str(uuid.uuid4()),
            "name": name,
            "grantedAt": fake.date_between("-1y", "today").isoformat(),
            "coinCost": cost,
            "isRare": cost >= 1000,
            "description": desc,
        })
    headers = ["id", "name", "grantedAt", "coinCost", "isRare", "description"]
    rows = [[a[h] for h in headers] for a in awards]
    write_csv("awards.csv", headers, rows)
    return awards


# ---------------------------------------------------------------------------
# 3. Generate Relationship CSVs
# ---------------------------------------------------------------------------


def generate_member_of(users, communities):
    """Every user in at least 1 community; ~5000 total memberships."""
    memberships = set()
    rows = []

    # Ensure every user is in at least 1 community
    for u in users:
        c = random.choice(communities)
        memberships.add((u["id"], c["id"]))

    # Fill up to ~5000
    while len(memberships) < 5000:
        u = random.choice(users)
        c = random.choice(communities)
        memberships.add((u["id"], c["id"]))

    for uid, cid in memberships:
        r = random.random()
        role = "admin" if r < 0.05 else ("moderator" if r < 0.20 else "member")
        rows.append([
            uid, cid,
            fake.date_between("-2y", "today").isoformat(),
            role,
            random.random() < 0.90,
        ])

    write_csv("member_of.csv",
              ["user_id", "community_id", "joinedAt", "role", "isActive"],
              rows)


def generate_wrote(users, posts):
    """Every post gets exactly 1 author."""
    rows = []
    for p in posts:
        author = random.choice(users)
        is_edited = random.random() < 0.20
        created = p["createdAt"]
        edited_at = ""
        if is_edited:
            from datetime import date
            d = date.fromisoformat(created)
            delta = random.randint(1, 60)
            edited_date = d + timedelta(days=delta)
            edited_at = edited_date.isoformat()
        rows.append([
            author["id"], p["id"], created, is_edited, edited_at
        ])
    write_csv("wrote.csv",
              ["user_id", "post_id", "postedAt", "isEdited", "editedAt"],
              rows)
    return rows  # Return for reference (author mapping)


def generate_posted_in(posts, communities, users):
    """Every post in exactly 1 community."""
    post_community = {}
    rows = []
    for p in posts:
        c = random.choice(communities)
        post_community[p["id"]] = c
        approver = random.choice(users)["username"] if random.random() < 0.7 else "AutoMod"
        rows.append([
            p["id"], c["id"], p["createdAt"], p["isPinned"], approver
        ])
    write_csv("posted_in.csv",
              ["post_id", "community_id", "postedAt", "isPinned", "approvedBy"],
              rows)
    return post_community


def generate_upvoted(users, posts, post_community, target: int = 4000):
    """~4000 random user-post upvotes (no duplicates)."""
    pairs = set()
    while len(pairs) < target:
        u = random.choice(users)
        p = random.choice(posts)
        pairs.add((u["id"], p["id"]))

    rows = []
    for uid, pid in pairs:
        comm = post_community.get(pid)
        comm_name = comm["name"] if comm else ""
        rows.append([
            uid, pid,
            fake.date_between("-1y", "today").isoformat(),
            2 if random.random() < 0.10 else 1,
            comm_name,
        ])
    write_csv("upvoted.csv",
              ["user_id", "post_id", "votedAt", "value", "fromCommunity"],
              rows)


def generate_commented_on(users, posts, target: int = 3000):
    """~3000 random user-post comments."""
    from datetime import date

    pairs = set()
    while len(pairs) < target:
        u = random.choice(users)
        p = random.choice(posts)
        pairs.add((u["id"], p["id"]))

    rows = []
    for uid, pid in pairs:
        post = next(p for p in posts if p["id"] == pid)
        post_date = date.fromisoformat(post["createdAt"])
        delta = random.randint(0, 180)
        comment_date = post_date + timedelta(days=delta)
        rows.append([
            uid, pid,
            comment_date.isoformat(),
            random.randint(0, 500),
            random.random() < 0.05,
        ])
    write_csv("commented_on.csv",
              ["user_id", "post_id", "commentedAt", "upvotes", "isDeleted"],
              rows)


def generate_follows(users, target: int = 3000):
    """~3000 follow relationships (no self-follows, no duplicates)."""
    pairs = set()
    while len(pairs) < target:
        a = random.choice(users)
        b = random.choice(users)
        if a["id"] != b["id"]:
            pairs.add((a["id"], b["id"]))

    # Check mutual follows
    pair_set = pairs.copy()
    rows = []
    for fid, tid in pairs:
        mutual = (tid, fid) in pair_set
        rows.append([
            fid, tid,
            fake.date_between("-2y", "today").isoformat(),
            random.random() < 0.60,
            mutual,
        ])
    write_csv("follows.csv",
              ["from_user_id", "to_user_id", "followedAt", "notificationsOn", "mutualFollow"],
              rows)


def generate_about(posts, games):
    """Every post linked to at least 1 game; ~2500 total."""
    pairs = set()
    rows = []

    # Every post -> at least 1 game
    for p in posts:
        g = random.choice(games)
        pairs.add((p["id"], g["id"]))

    # Fill to ~2500
    while len(pairs) < 2500:
        p = random.choice(posts)
        g = random.choice(games)
        pairs.add((p["id"], g["id"]))

    post_map = {p["id"]: p for p in posts}
    for pid, gid in pairs:
        post = post_map[pid]
        rows.append([
            pid, gid,
            round(random.uniform(0.1, 1.0), 2),
            random.random() < 0.15,
            post["createdAt"],
        ])
    write_csv("about.csv",
              ["post_id", "game_id", "relevanceScore", "containsSpoiler", "taggedAt"],
              rows)


def generate_tagged_with(posts, tags, users, target: int = 2000):
    """~2000 post-tag relationships."""
    pairs = set()
    while len(pairs) < target:
        p = random.choice(posts)
        t = random.choice(tags)
        pairs.add((p["id"], t["id"]))

    rows = []
    for pid, tid in pairs:
        tagger = random.choice(users)["username"] if random.random() < 0.60 else "system"
        rows.append([
            pid, tid,
            fake.date_between("-1y", "today").isoformat(),
            tagger,
            random.random() < 0.40,
        ])
    write_csv("tagged_with.csv",
              ["post_id", "tag_id", "taggedAt", "taggedBy", "isAutoTagged"],
              rows)


def generate_related_to(communities, games):
    """Every community linked to at least 1 game."""
    pairs = set()
    rows = []

    # Every community -> at least 1 game (primary)
    first_game_per_community = {}
    for c in communities:
        g = random.choice(games)
        pairs.add((c["id"], g["id"]))
        first_game_per_community[c["id"]] = g["id"]

    # Add a few more links
    extra = random.randint(50, 150)
    for _ in range(extra):
        c = random.choice(communities)
        g = random.choice(games)
        pairs.add((c["id"], g["id"]))

    for cid, gid in pairs:
        comm = next(c for c in communities if c["id"] == cid)
        is_primary = first_game_per_community.get(cid) == gid
        rows.append([
            cid, gid,
            round(random.uniform(0.1, 1.0), 2),
            comm["createdDate"],
            is_primary,
        ])
    write_csv("related_to.csv",
              ["community_id", "game_id", "strength", "linkedAt", "isPrimary"],
              rows)


def generate_received_award(posts, awards, users, target: int = 500):
    """~500 post-award relationships."""
    rows = []
    for _ in range(target):
        p = random.choice(posts)
        a = random.choice(awards)
        awarder = random.choice(users)
        msg = fake.sentence(nb_words=random.randint(3, 8)) if random.random() < 0.60 else ""
        rows.append([
            p["id"], a["id"],
            fake.date_between("-1y", "today").isoformat(),
            awarder["username"],
            msg,
        ])
    write_csv("received_award.csv",
              ["post_id", "award_id", "awardedAt", "awardedBy", "message"],
              rows)


def generate_crossposted_to(posts, communities, post_community, target: int = 200):
    """~200 crossposts to a different community than the original."""
    rows = []
    attempts = 0
    used = set()
    while len(rows) < target and attempts < target * 10:
        attempts += 1
        p = random.choice(posts)
        original_comm = post_community.get(p["id"])
        if not original_comm:
            continue
        other_comms = [c for c in communities if c["id"] != original_comm["id"]]
        if not other_comms:
            continue
        dest = random.choice(other_comms)
        key = (p["id"], dest["id"])
        if key in used:
            continue
        used.add(key)

        from datetime import date
        post_date = date.fromisoformat(p["createdAt"])
        cross_date = post_date + timedelta(days=random.randint(1, 30))

        rows.append([
            p["id"], dest["id"],
            cross_date.isoformat(),
            p["id"],
            random.random() < 0.80,
        ])
    write_csv("crossposted_to.csv",
              ["post_id", "community_id", "crosspostedAt", "originalPostId", "approved"],
              rows)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print("=" * 60)
    print("GGBoard Data Generator")
    print("=" * 60)

    # -- Fetch games from RAWG --
    print("\n[1/12] Fetching games from RAWG API ...")
    games = fetch_games()
    generate_games_csv(games)

    # -- Generate nodes --
    print("\n[2/12] Generating users ...")
    users = generate_users(2000)

    print("\n[3/12] Generating communities ...")
    communities = generate_communities(100)

    print("\n[4/12] Generating posts ...")
    posts = generate_posts(2000)

    print("\n[5/12] Generating tags ...")
    tags = generate_tags()

    print("\n[6/12] Generating awards ...")
    awards = generate_awards()

    # -- Generate relationships --
    print("\n[7/12] Generating member_of relationships ...")
    generate_member_of(users, communities)

    print("\n[8/12] Generating wrote + posted_in relationships ...")
    generate_wrote(users, posts)
    post_community = generate_posted_in(posts, communities, users)

    print("\n[9/12] Generating upvoted + commented_on + follows ...")
    generate_upvoted(users, posts, post_community)

    # Build a post lookup for commented_on (optimise the next call)
    generate_commented_on(users, posts)
    generate_follows(users)

    print("\n[10/12] Generating about + tagged_with ...")
    generate_about(posts, games)
    generate_tagged_with(posts, tags, users)

    print("\n[11/12] Generating related_to + received_award ...")
    generate_related_to(communities, games)
    generate_received_award(posts, awards, users)

    print("\n[12/12] Generating crossposted_to ...")
    generate_crossposted_to(posts, communities, post_community)

    print("\n" + "=" * 60)
    print("Data generation complete!")
    print(f"CSV files saved to: {os.path.abspath(DATA_DIR)}")
    print("=" * 60)


if __name__ == "__main__":
    main()
