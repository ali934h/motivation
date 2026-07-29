# Motivation

A minimal, dark-mode admin panel for managing a deck of motivational cards. Each card can have a text side, an image side, or both, and cards can be reordered by drag-and-drop on both desktop and mobile.

**Stack:** React + Vite · Cloudflare Pages · Cloudflare Pages Functions · Cloudflare KV · Cloudinary (unsigned uploads)

Everything in this project is deployed **entirely through the Cloudflare dashboard** — no `wrangler` CLI and no local config files for bindings or environment variables are required.

## Features

- Hidden panel: the app only responds at a secret path you choose, not a guessable fixed route.
- First-visit password setup, then a login screen with hashed (SHA-256 + salt) password storage in KV — never stored in plaintext.
- HttpOnly/Secure/SameSite session cookies, plus simple IP-based rate limiting on login attempts.
- Unlimited cards, each with an optional text side and/or optional image side, flippable with a click/tap.
- Drag-and-drop reordering built with [`@dnd-kit`](https://dndkit.com/), which works reliably on both mouse and touch.
- Direct-from-browser image uploads to Cloudinary using an unsigned upload preset (no server involved).

## Repository layout

```
functions/          Cloudflare Pages Functions (the API)
  _middleware.js     Guards the secret path + session checks
  _lib/auth.js       Password hashing, sessions, rate limiting helpers
  api/auth/          setup, login, logout, session, status endpoints
  api/cards/         list/create, update/delete, reorder endpoints
src/                 React front-end
  components/        UI components (cards, grid, modals, forms)
  hooks/              useAuth, useCards
  utils/              api.js (fetch wrapper), cloudinary.js (upload helper)
```

## 1. Prerequisites

- A GitHub account with this repository pushed to it.
- A Cloudflare account (free tier is enough).
- A Cloudinary account (free tier) with an **unsigned upload preset**.

### Create the Cloudinary unsigned upload preset

1. Log into [Cloudinary's dashboard](https://cloudinary.com/console).
2. Go to **Settings → Upload** → **Upload presets** → **Add upload preset**.
3. Set **Signing Mode** to **Unsigned**.
4. Save, and note the **preset name** and your **Cloud name** (shown at the top of the dashboard).

## 2. Create the KV namespace (Cloudflare dashboard)

1. In the Cloudflare dashboard, go to **Storage & Databases → KV**.
2. Click **Create a namespace**, name it e.g. `MOTIVATION_KV`, and create it.
3. You don't need to add any keys manually — the app creates and manages all of them.

## 3. Create the Pages project and connect GitHub

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages → Connect to Git**.
2. Choose the `motivation` repository and authorize access if prompted.
3. Configure the build settings:
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Before the first deploy, expand **Environment variables** (see the next section) and add them for both **Production** and **Preview**.
5. Click **Save and Deploy**.

## 4. Set environment variables (Cloudflare dashboard)

Go to your Pages project → **Settings → Environment variables**, and add the following for **both Production and Preview**:

| Variable | Example value | Notes |
|---|---|---|
| `VITE_PANEL_PATH` | `panel-9f2a7c` | Choose your own random, unguessable string. Used as the hidden URL path. |
| `VITE_CLOUDINARY_CLOUD_NAME` | `dxxxxxx` | From your Cloudinary dashboard. |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | `motivation_unsigned` | The unsigned preset name you created. |
| `PANEL_SECRET_PATH` | `panel-9f2a7c` | **Must be identical** to `VITE_PANEL_PATH` above — this is what the API checks server-side. |
| `SESSION_TTL_SECONDS` | `604800` | Optional. Session lifetime in seconds (default: 7 days). |

> `VITE_`-prefixed variables are baked into the client build; the others stay server-side for the Pages Functions. Because Vite variables are embedded at build time, redeploy (or trigger a new build) after changing them.

## 5. Bind the KV namespace to Pages Functions (Cloudflare dashboard)

1. Go to your Pages project → **Settings → Functions → KV namespace bindings**.
2. Click **Add binding**.
3. **Variable name:** `MOTIVATION_KV` (must match exactly — this is the name used in the code).
4. **KV namespace:** select the `MOTIVATION_KV` namespace you created in step 2.
5. Save. Redeploy the project (Deployments → Retry deployment, or push a new commit) so the binding takes effect.

## 6. First run

1. Visit `https://<your-project>.pages.dev/<VITE_PANEL_PATH>` (the exact path you chose above — the root `/` intentionally shows nothing useful).
2. You'll see the **Set up your password** screen since no password exists yet. Choose one (at least 8 characters).
3. You're now logged in. Add your first card with the **+** tile, and drag cards to reorder them.
4. On future visits, you'll see the login screen instead.

## Local development (optional)

You don't need this to deploy, but if you want to run it locally:

```bash
npm install
cp .env.example .env.local   # fill in your own values
npm run dev
```

Note that Pages Functions (the `/api/*` routes) aren't served by plain `vite dev`. To test the full stack locally you would need Cloudflare's local Pages dev server, which is outside the scope of this dashboard-only setup.

## Security notes

- Passwords are hashed with SHA-256 and a random per-install salt before being stored in KV; the plaintext password is never persisted.
- The panel is only reachable at the secret path you configure — both on the client route and via a required `X-Panel-Secret` header checked by the API middleware.
- Session cookies are `HttpOnly`, `Secure`, and `SameSite=Strict`.
- Failed login attempts are rate-limited per IP (5 attempts per 10-minute window).
