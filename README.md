# auth_node

Simple Express authentication example (local dev). This repository contains a small Node/Express app with MongoDB-backed sessions, EJS views, and minimal auth routes (register/login/dashboard).

This README explains how to configure, run and troubleshoot the app for local development and how the app expects secrets/config to be provided.

## Requirements
- Node.js (16+ recommended)
- npm
- A MongoDB instance (Atlas or local `mongod`) if you want persistent sessions and users

## Quick start (development)

1. Install dependencies

```bash
npm install
```

2. Copy the example env and edit it

```bash
cp .env.example .env
# Edit .env and set MONGO_URI (or DB_USER/DB_PASSWORD) and SESSION_SECRET
```

3. Start the app

```bash
# development (uses nodemon if present)
npm run dev

# or plain node
node server.js
```

Open http://localhost:3000 in your browser.

## Environment variables
The app reads configuration from environment variables (or from `config/default.json` as a fallback). Use `.env` for local dev.

Important variables:

- `MONGO_URI` — full MongoDB connection string (preferred). Example for Atlas:
  `mongodb+srv://abeni:REPLACEME@cluster0.example.mongodb.net/mydatabase?retryWrites=true&w=majority`
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_CLUSTER` — optional: the app can build a URI if these are set (passwords will be URL-encoded).
- `SESSION_SECRET` — a long random string used to sign session cookies. Generate one with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
  ```

Do NOT commit `.env` to version control. `.env.example` is included as a template.

## Views and static files
- Views are EJS files in `views/` (e.g. `views/landing.ejs`, `views/dashboard.ejs`).
- Static assets are served from `public/`.

## Sessions
- The app uses `express-session` and `connect-mongodb-session` to persist sessions to MongoDB when a working `MONGO_URI` is configured. In development, if no DB is available, the app falls back to an in-memory session store (not suitable for production).

## Content Security Policy (CSP)
- A relaxed CSP is applied in development to allow inline styles and loading of dev resources. For production you should tighten the policy: remove `'unsafe-inline'` and use nonces or hashes for inline scripts/styles.

## Common troubleshooting

- `ECONNREFUSED 127.0.0.1:27017` — the app tried to connect to a local MongoDB that isn't running. Either start `mongod` locally or set `MONGO_URI` to your Atlas/remote cluster.
- `MongoServerError: bad auth` — Atlas rejected the credentials. Verify the user/password and that your IP is whitelisted in Atlas Network Access.
- `CSP` image/style/script blocked — update CSP in `server.js` (development only) or host assets locally in `public/`.
- `res.render` errors — ensure EJS is installed (`npm install ejs`) and `app.set('view engine', 'ejs')` is configured (this repo already sets it).

## Tests & quick checks
- Check dependencies: `npm list --depth=0`
- Confirm Node version: `node -v`
- Inspect logs when running `node server.js` — the app prints DB connection status and session-related messages.

## Production notes
- Use an environment-based secret store (AWS Secrets Manager, Vault, or host-provided env vars).
- Use a process manager such as `pm2` or a systemd unit to run the app.
- Configure HTTPS / reverse proxy (Nginx) and set `cookie.secure` in session options.
- Lock down CSP and enable reporting to monitor violations.

## Files of interest
- `server.js` — app entrypoint, session and DB wiring, CSP and routes registration.
- `config/db.js` — DB URI builder / connection helper.
- `config/default.json` — optional default config (kept intentionally minimal)
- `.env.example` — template for your environment variables.

## License
This project has no license file. Add one if you plan to publish.

---
