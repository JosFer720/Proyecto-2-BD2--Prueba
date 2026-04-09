# GGBoard — Plan de Implementacion

## Contexto

GGBoard es una plataforma de comunidades tipo Reddit enfocada en videojuegos, para el curso CC3089 Base de Datos 2 (fecha limite: 5 de mayo de 2026). Usa Neo4j AuraDB como base de datos orientada a grafos para modelar usuarios, posts, comunidades, juegos, tags y awards con relaciones ricas. El proyecto se evalua sobre una rubrica de 100 puntos (+20 bonus) que cubre operaciones CRUD sobre nodos/relaciones, consultas Cypher, carga CSV, y opcionalmente algoritmos GDS + frontend excepcional.

El directorio del proyecto esta actualmente **vacio**. Se construye todo desde cero.

---

## Restricciones Tecnicas

1. **AuraDB Free NO soporta la libreria GDS** — usaremos Python `networkx` para ejecutar PageRank, Louvain y Shortest Path reales del lado del servidor (fetch del grafo via Cypher, computo en Python, retorno de resultados)
2. **AuraDB LOAD CSV requiere URLs publicas** — parseamos CSVs del lado del servidor en Python, usamos `UNWIND $batch` para inserciones masivas
3. **Limites de AuraDB:** 50K nodos / 175K relaciones — nuestros ~5,250 nodos + ~20K relaciones caben sin problema
4. **RAWG API** requiere un API key gratuito de rawg.io/apidocs

---

## Estructura del Proyecto

```
ggboard/
├── .env                          # Credenciales Neo4j + RAWG (nunca se commitea)
├── .gitignore
├── backend/
│   ├── main.py                   # App FastAPI, CORS, lifespan, inclusion de routers
│   ├── db.py                     # Singleton del driver Neo4j + helper de sesion
│   ├── models.py                 # Schemas Pydantic de request/response
│   ├── requirements.txt
│   ├── routers/
│   │   ├── users.py              # CRUD para nodos User
│   │   ├── posts.py              # CRUD para nodos Post
│   │   ├── communities.py        # CRUD para nodos Community
│   │   ├── games.py              # CRUD para nodos Game
│   │   ├── tags.py               # CRUD para nodos Tag
│   │   ├── awards.py             # CRUD para nodos Award
│   │   ├── relationships.py      # CRUD generico para los 11 tipos de relaciones
│   │   ├── queries.py            # 6 consultas Cypher avanzadas
│   │   ├── graph.py              # Endpoint de subgrafo para visualizacion
│   │   ├── csv_upload.py         # Subida de archivos CSV → creacion masiva
│   │   └── gds.py                # PageRank, Louvain, shortestPath con networkx
│   ├── scripts/
│   │   ├── generate_data.py      # Faker + RAWG API → archivos CSV
│   │   └── load_csv.py           # Lee CSVs + UNWIND masivo hacia AuraDB
│   └── data/                     # Archivos CSV generados (en gitignore)
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── index.html
│   └── src/
│       ├── App.jsx               # Configuracion de React Router
│       ├── api/client.js         # Instancia Axios + funciones de API
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── NodeTable.jsx     # Tabla reutilizable con filtros y orden
│       │   ├── NodeForm.jsx      # Formulario dinamico de crear/editar
│       │   ├── PropertyEditor.jsx # Agregar/actualizar/eliminar props inline
│       │   └── RelationshipPanel.jsx
│       └── pages/
│           ├── Dashboard.jsx
│           ├── UserList.jsx, UserDetail.jsx
│           ├── PostList.jsx, PostDetail.jsx
│           ├── CommunityList.jsx, CommunityDetail.jsx
│           ├── GameList.jsx, GameDetail.jsx
│           ├── TagList.jsx, AwardList.jsx
│           ├── RelationshipManager.jsx
│           ├── QueryExplorer.jsx
│           ├── CsvUpload.jsx
│           ├── GraphView.jsx     # react-force-graph-2d (bonus)
│           └── GDSPage.jsx       # Algoritmos GDS (bonus)
└── README.md
```

---

## Fases de Implementacion

### Fase 1: Scaffolding + Generacion de Datos (en paralelo)

**1a. Scaffolding del proyecto:**
- Crear `.gitignore` (`.env`, `__pycache__/`, `node_modules/`, `backend/data/*.csv`)
- Crear `.env` con credenciales Neo4j + RAWG_API_KEY
- Crear `backend/requirements.txt`: fastapi, uvicorn[standard], neo4j, python-dotenv, faker, requests, python-multipart, networkx
- Crear `backend/db.py`: singleton del driver Neo4j, `get_driver()`, helper de sesion
- Crear `backend/main.py`: app FastAPI con CORS (localhost:5173), lifespan para el driver, health check
- Scaffolding frontend: `npm create vite@latest` con template React, instalar tailwindcss, react-router-dom, axios, react-force-graph-2d

**1b. Generacion de datos (`generate_data.py`):**
- Obtener ~500 juegos de RAWG API (paginado)
- Generar ~2000 Users (Faker), ~100 Communities, ~2000 Posts, ~100 Tags, ~50 Awards
- Generar CSVs de relaciones asegurando conectividad: cada Post → Community → Game, cada User → al menos 1 Community
- Salida: 6 CSVs de nodos + 11 CSVs de relaciones en `backend/data/`

**1c. Carga de datos (`load_csv.py`):**
- Crear indices en `id` para las 6 etiquetas
- Leer CSVs, agrupar en lotes de 500, ejecutar queries `UNWIND $batch AS row CREATE/MERGE`
- Orden de carga: Games → Communities → Users → Posts → Tags → Awards → todas las relaciones

### Fase 2: CRUD de Nodos (40 pts — maxima prioridad)

Cada uno de los 6 routers de nodos sigue este patron uniforme:

| Endpoint | Cobertura de Rubrica |
|---|---|
| `POST /` | Crear con 1 label + 5+ props (10 pts) |
| `POST /multi-label` | Crear con 2+ labels ej. User:Moderator (5 pts) |
| `GET /{id}` | Consultar 1 nodo por filtro |
| `GET /` con query params | Consultar multiples nodos con filtros |
| `GET /aggregate` | Agregaciones COUNT, AVG, SUM (parte de 5 pts) |
| `PATCH /{id}/properties` | Agregar/actualizar props en 1 nodo |
| `PATCH /properties/batch` | Agregar/actualizar props en multiples nodos (parte de 10 pts) |
| `DELETE /{id}/properties` | Eliminar props de 1 nodo |
| `DELETE /properties/batch` | Eliminar props de multiples nodos (parte de 10 pts) |
| `DELETE /{id}` | Eliminar 1 nodo (DETACH DELETE) |
| `DELETE /batch` | Eliminar multiples nodos (parte de 5 pts) |

Ejemplos multi-label: User:Moderator, User:Admin, Game:Indie, Post:Pinned. Labels validados contra una whitelist para prevenir inyeccion.

### Fase 3: CRUD de Relaciones (20 pts)

Un solo router generico (`relationships.py`) maneja los 11 tipos de relaciones:
- Crear relacion con tipo + 3+ propiedades (5 pts)
- Agregar/actualizar/eliminar propiedades en relaciones individuales + multiples (10 pts)
- Eliminar relaciones individuales + multiples (5 pts)
- Tipo de relacion validado contra whitelist de 11 tipos permitidos

### Fase 4: Consultas Cypher (15 pts)

Seis consultas (2 por integrante) en `queries.py`:
1. Posts mas votados sobre un juego en comunidades del usuario
2. Usuarios sugeridos (comunidades compartidas, no seguidos)
3. Comunidades mas activas (posts en ultimos 30 dias)
4. Juego con mas comunidades + promedio de karma de usuarios
5. Camino mas corto entre dos usuarios via FOLLOWS (`shortestPath()`)
6. Posts con awards raros agrupados por comunidad

### Fase 5: Carga CSV desde UI (5 pts)

- Backend: `POST /api/csv/upload` acepta archivo multipart + metadata (label de nodo o tipo de relacion)
- Parsea CSV del lado del servidor, ejecuta queries UNWIND masivos
- Frontend: zona drag-and-drop, selector de tipo, preview del CSV, boton de subida

### Fase 6: Frontend (10 pts bonus)

- React Router con paginas para cada tipo de entidad (lista + detalle)
- Componentes reutilizables: NodeTable, NodeForm, PropertyEditor, RelationshipPanel
- Dashboard con estadisticas agregadas
- Pagina QueryExplorer: seleccionar query, ingresar parametros, ver resultados
- **GraphView** con react-force-graph-2d: nodos coloreados por label (User=azul, Post=verde, Community=naranja, Game=rojo, Tag=morado, Award=dorado), click → panel de detalle, busqueda para centrar

### Fase 7: Algoritmos GDS (10 pts bonus)

Python `networkx` para resultados de algoritmos reales (AuraDB Free no tiene libreria GDS):
- **PageRank:** fetch de aristas FOLLOWS via Cypher → construir `nx.DiGraph()` → `nx.pagerank()` → retornar usuarios rankeados
- **Louvain:** fetch de aristas usuario-comunidad → `louvain_communities()` → retornar clusters
- **Shortest Path:** Cypher nativo `shortestPath()` (soportado en todos los tiers de AuraDB) + `nx.shortest_path()` como fallback
- Agregar `networkx` a `requirements.txt`

---

## Modelo de Datos

### 6 Etiquetas de Nodos (cada una con 5+ propiedades)

| Label | Propiedades |
|---|---|
| **User** | id (String/UUID), username (String), joinDate (Date), karmaPoints (Integer), isPremium (Boolean), favoriteGenres (List) |
| **Community** | id (String), name (String), createdDate (Date), memberCount (Integer), isNSFW (Boolean), rules (List) |
| **Post** | id (String/UUID), title (String), body (String), createdAt (Date), upvotes (Integer), isPinned (Boolean), flairs (List) |
| **Game** | id (String), title (String), releaseDate (Date), metacriticScore (Float), isMultiplayer (Boolean), platforms (List) |
| **Tag** | id (String), name (String), createdAt (Date), usageCount (Integer), isOfficial (Boolean), relatedTags (List) |
| **Award** | id (String), name (String), grantedAt (Date), coinCost (Integer), isRare (Boolean), description (String) |

### 11 Tipos de Relaciones (cada una con 3+ propiedades)

| Relacion | Entre | Propiedades |
|---|---|---|
| MEMBER_OF | User → Community | joinedAt (Date), role (String), isActive (Boolean) |
| WROTE | User → Post | postedAt (Date), isEdited (Boolean), editedAt (Date) |
| POSTED_IN | Post → Community | postedAt (Date), isPinned (Boolean), approvedBy (String) |
| UPVOTED | User → Post | votedAt (Date), value (Integer), fromCommunity (String) |
| COMMENTED_ON | User → Post | commentedAt (Date), upvotes (Integer), isDeleted (Boolean) |
| FOLLOWS | User → User | followedAt (Date), notificationsOn (Boolean), mutualFollow (Boolean) |
| ABOUT | Post → Game | relevanceScore (Float), containsSpoiler (Boolean), taggedAt (Date) |
| TAGGED_WITH | Post → Tag | taggedAt (Date), taggedBy (String), isAutoTagged (Boolean) |
| RELATED_TO | Community → Game | strength (Float), linkedAt (Date), isPrimary (Boolean) |
| RECEIVED_AWARD | Post → Award | awardedAt (Date), awardedBy (String), message (String) |
| CROSSPOSTED_TO | Post → Community | crosspostedAt (Date), originalPostId (String), approved (Boolean) |

---

## Decisiones de Diseno Clave

1. **Batch UNWIND en vez de LOAD CSV** — AuraDB no puede leer archivos locales; parseo en Python + UNWIND parametrizado es equivalente y mas flexible
2. **Un solo router de relaciones** — evita duplicar logica CRUD entre 11 tipos; validacion por whitelist previene inyeccion
3. **Modelos Pydantic en un archivo** — el proyecto es suficientemente pequeno; mantiene los routers limpios
4. **Python networkx para GDS** — fetch del grafo via Cypher, ejecutar PageRank/Louvain reales en networkx; `shortestPath()` se queda en Cypher nativo
5. **Endpoint de subgrafo para visualizacion** — vecindario acotado de profundidad 2 (max 200 nodos) mantiene el rendering performante

---

## Plan de Verificacion

1. **Salud del backend:** `GET /api/health` retorna OK + conexion a Neo4j confirmada
2. **Datos cargados:** Ejecutar `MATCH (n) RETURN labels(n)[0] AS label, count(n) ORDER BY label` — verificar 5000+ nodos en 6 labels
3. **CRUD nodos:** Probar cada endpoint via la UI: crear, leer (individual/multiple/agregado), agregar/actualizar/eliminar propiedades (individual/batch), eliminar (individual/batch)
4. **CRUD relaciones:** Crear una relacion con 3+ props, luego agregar/actualizar/eliminar props, luego eliminar la relacion — individual y batch
5. **Consultas Cypher:** Ejecutar las 6 consultas desde la pagina QueryExplorer, verificar resultados significativos
6. **Carga CSV:** Subir un CSV de prueba pequeno, verificar nodos/relaciones creados
7. **Visualizacion del grafo:** Navegar a GraphView, verificar nodos coloreados, interaccion por click, busqueda
8. **GDS:** Ejecutar PageRank (verificar usuarios rankeados), Shortest Path (verificar camino entre dos usuarios), Louvain (verificar clusters)
9. **Conectividad:** Ejecutar `MATCH (n) WHERE NOT (n)--() RETURN count(n)` — debe retornar 0
