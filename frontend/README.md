# Roomify — frontend

Next.js 16 app for photographing a room, picking a style and getting an AI redesign.

```bash
npm install
cp .env.example .env.local   # then fill in the values (see below)
npm run db:migrate           # creates data/roomify.db
npm run dev                  # http://localhost:3000
```

## Pages
- `/` — landing page
- `/signin` — Google sign-in (creates the account on first use)
- `/design` — studio: take/upload photo → room type, style, wishes, strength → generate → before/after compare
- `/gallery` — the signed-in user's saved designs

`/design` and `/gallery` require sign-in (`src/proxy.ts` redirects to `/signin`).

## Auth & database
- **Auth:** [Better Auth](https://better-auth.com) with Google — config in `src/lib/auth.ts`.
  1. Google Cloud Console → APIs & Services → Credentials → *Create OAuth client ID* → *Web application*.
  2. Authorised redirect URI: `http://localhost:3000/api/auth/callback/google`.
  3. Put the ID/secret in `.env.local` as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- **Database:** SQLite file (`data/roomify.db`) via Drizzle ORM, holding the **auth tables only**
  (`user`, `session`, `account`, `verification`) — schema in `src/db/schema.ts`.
  After changing it: `npm run db:generate && npm run db:migrate`. Browse with `npm run db:studio`.
- **Designs** live in the Python backend (`../backend`) and its own database.

## Talking to the backend
The browser only calls this app's `/api/designs` routes. Each route checks the Better Auth session,
then calls the backend (`src/lib/backend.ts`) with the shared `BACKEND_API_KEY` and the user's
identity. Set `BACKEND_URL` and `BACKEND_API_KEY` in `.env.local` (the key must equal
`INTERNAL_API_KEY` in `backend/.env`).

| method | path | |
|---|---|---|
| GET | `/api/designs` | list the current user's designs |
| POST | `/api/designs` | multipart `image, room_type, style, prompt, strength` → plans, renders and saves a design |
| DELETE | `/api/designs/:id` | delete a design and its images |
| GET | `/api/designs/:id/:kind` | `kind` = `before` or `after` |
