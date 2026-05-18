# Nova Directory

Brand directory for the NOVA stores (NovaPaw, NovaLift, NovaPod). One tab per store, three sub-tabs each:

- **Pages** — Prelanders + PDPs with a Current Redirects section below. Pages that are the source of a redirect show a yellow `Redirecting →` badge; clicking it shows the full forward chain from that page.
- **Ad Accounts** — Name, status (active = green, disabled = red), and a free-form notes field.
- **Naming Conventions** — Editable format string + three editable tables (Structure Breakdown, Format Type Abbreviations, Full Examples).

Auth is a single shared password (cookie-based session).

## Stack

- Static `index.html` (vanilla JS)
- Vercel serverless functions in `api/`
- Neon Postgres

## One-time setup

1. **Create a Neon database** and copy its connection string.
2. **Run `schema.sql`** once in the Neon SQL Editor. It creates the tables and seeds the default naming format for each store.
3. **Create a Vercel project** pointing at this folder.
4. **Set environment variables** in Vercel:
   - `DATABASE_URL` — the Neon connection string.
   - `APP_PASSWORD` — the shared team password.
5. Deploy. Visit the deployed URL and sign in with the password.

## Local notes

- `package.json` only declares `@neondatabase/serverless`. There's no build step — `index.html` is served as-is.
- The Vercel rewrites in `vercel.json` give the API nice URLs (`/api/pages/:id`, etc.) and let `/novapaw`, `/novapod`, `/novalift` fall through to the SPA.
- Redirects must point from one page in the directory to another. Cycles are rejected server-side.
