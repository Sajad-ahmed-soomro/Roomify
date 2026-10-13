# Roomify backend

FastAPI service that turns a room photo into a redesign and stores each user's designs.

```
browser ──► Next.js /api/designs ──► FastAPI /v1/designs
           (checks the session)       1. Claude looks at the photo and plans the design
                                      2. Stable Diffusion img2img renders it
                                      3. saves images + design to this service's database
```

## Run it

```bash
# from the repo root (uses ../.venv)
.venv/bin/pip install -r backend/requirements.txt
cd backend
cp .env.example .env                        # set INTERNAL_API_KEY (= BACKEND_API_KEY in frontend/.env.local)
../.venv/bin/alembic upgrade head           # creates data/roomify.db
../.venv/bin/uvicorn app.main:app --port 8000
```

API docs: http://127.0.0.1:8000/docs · health: `GET /health`.

## Settings (`.env`)

| variable | default | |
|---|---|---|
| `INTERNAL_API_KEY` | — (required) | shared secret the Next.js server sends as `X-Internal-Key` |
| `ANTHROPIC_API_KEY` | empty | Claude key. Without it designs use a template prompt and have no designer notes |
| `LLM_MODEL` | `claude-opus-5-5` | |
| `LLM_EFFORT` | `low` | `low`…`max`; higher is slower and costs more |
| `IMAGE_ENGINE` | `sd` | `sd` = Stable Diffusion 1.5 on this machine; `demo` = instant colour-graded preview |
| `SD_STEPS` | `30` | more steps = slower, slightly finer detail |
| `DATABASE_URL` | `sqlite+aiosqlite:///data/roomify.db` | e.g. `postgresql+asyncpg://…` (install `asyncpg`) |
| `STORAGE_DIR` | `data/uploads` | image files |

The first `sd` run downloads ~2 GB of model weights to `~/.cache/huggingface`. If that stalls,
set `HF_HUB_DISABLE_XET=1`.

## Database

| table | |
|---|---|
| `users` | id (from Better Auth), email, name, avatar, created, last seen — synced on every request |
| `designs` | owner, room type, style, wishes, strength, seed, Claude's title / analysis / image prompt, model used, engine, timing, image paths |

Change `app/models.py`, then:

```bash
../.venv/bin/alembic revision --autogenerate -m "describe change"
../.venv/bin/alembic upgrade head
```

## API

All `/v1` routes need `X-Internal-Key` and `X-User` (base64url JSON `{id, email, name, image}`).

| method | path | |
|---|---|---|
| POST | `/v1/designs` | multipart `image, room_type, style, strength (0–1), prompt?, seed?` |
| GET | `/v1/designs` | the user's designs, newest first |
| GET | `/v1/designs/{id}` | one design |
| GET | `/v1/designs/{id}/{before\|after}` | JPEG |
| DELETE | `/v1/designs/{id}` | design + images |
| GET | `/v1/me` | profile + design count |
| DELETE | `/v1/me` | delete the user and all their data |

## Where things live

- `app/services/designer.py` — Claude prompt and structured output (vision → design plan)
- `app/services/imagegen.py` — Stable Diffusion / demo rendering, one render at a time
- `app/services/storage.py` — image files (swap for S3/R2 when deploying)
- `app/catalog.py` — room types and styles (ids match `frontend/src/lib/styles.ts`)
