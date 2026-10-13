# Roomify backend

FastAPI service that turns a room photo into a redesign and stores each user's designs.

```
browser ──► Next.js /api/designs ──► FastAPI /v1/designs
           (checks the session)       1. Gemini (or Claude) looks at the photo and plans the design
                                      2. Stable Diffusion img2img renders it
                                      3. saves images + design to this service's database
```

## Run it

```bash
# from the repo root (uses ../.venv)
.venv/bin/pip install -r backend/requirements-worker.txt   # API + Stable Diffusion
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
| `LLM_PROVIDER` | `gemini` | `gemini` (free tier) or `anthropic` (Claude) |
| `GEMINI_API_KEY` | empty | free key from https://aistudio.google.com/apikey |
| `GEMINI_MODEL` | `gemini-flash-latest` | `GEMINI_FALLBACK_MODEL` (`gemini-flash-lite-latest`) is used when it's busy |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | empty / `claude-opus-5-5` | only when `LLM_PROVIDER=anthropic` |
| `IMAGE_ENGINE` | `sd` | `sd` = Stable Diffusion here; `remote` = call `worker.py` at `RENDER_URL` (key `RENDER_KEY`); `demo` = instant colour-graded preview |
| `SD_STEPS` | `30` | more steps = slower, slightly finer detail |
| `DATABASE_URL` | `sqlite+aiosqlite:///data/roomify.db` | Neon's `postgresql://…?sslmode=require` URL works as-is |
| `IMAGE_STORAGE` | `db` | `db` = images in the database; `s3` = bucket (`S3_BUCKET`, `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) |
| `MAX_DESIGNS_PER_USER` | `2` | `0` = unlimited; `UNLIMITED_EMAILS` = comma-separated exempt emails |

Without an LLM key (or if the LLM is down), designs use a template prompt and have no designer notes.

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

- `app/services/designer.py` — LLM prompt and structured output (vision → design plan), Gemini or Claude
- `app/services/imagegen.py` — Stable Diffusion / demo rendering, one render at a time
- `app/services/images.py` — where before/after images are stored (database or S3-compatible bucket)
- `worker.py` — render worker for running Stable Diffusion on another machine (your laptop)
- `app/catalog.py` — room types and styles (ids match `frontend/src/lib/styles.ts`)
