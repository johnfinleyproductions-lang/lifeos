# Deploying LifeOS to Coolify

This is the full playbook for deploying LifeOS to `lifeos.evergreenwellnessmktg.com` on M90t Coolify, with shared-session SSO to Evergreen Core.

The whole deploy is ~30-60 minutes if everything's wired up; longer the first time as you click around the Coolify UI.

---

## Prerequisites

- A GitHub account (a private repo will be fine — Coolify can pull from private repos with a deploy key)
- Coolify access on M90t at the usual admin URL
- DNS access for `evergreenwellnessmktg.com` so you can add a `lifeos` subdomain record (or confirm the wildcard cert covers it)
- Evergreen Core already deployed and reachable at `app.evergreenwellnessmktg.com`
- The LifeOS repo at `~/lifeos` is committed clean

---

## Step 1 — Push to GitHub

Create a private repo at github.com (call it whatever — `lifeos` is fine).

```
cd ~/lifeos
git remote add origin git@github.com:<your-username>/lifeos.git
git branch -M main
git push -u origin main
```

If `git remote add` says "remote origin already exists", run `git remote set-url origin git@github.com:<your-username>/lifeos.git` instead.

Verify it pushed:

```
git remote -v
git log --oneline -5
```

---

## Step 2 — Apply the LifeOS auth update (production cookieDomain)

The new `lib/auth/server.ts` reads a `BETTER_AUTH_COOKIE_DOMAIN` env var. When set, it enables cross-subdomain cookies. Local dev keeps working unchanged.

```
cd ~/lifeos
cp "/Users/tylerfreund/Documents/Claude/Projects/AI backend/lifeos-v4-prototype/lifeos-phase1/lib/auth/server.ts" lib/auth/server.ts
cp "/Users/tylerfreund/Documents/Claude/Projects/AI backend/lifeos-v4-prototype/lifeos-phase1/.env.example" .env.example
pnpm build
git add -A
git commit -m "Add production cookieDomain config for cross-subdomain SSO"
git push
```

---

## Step 3 — The ONE Evergreen Core change

This is the only EC code change in the entire LifeOS build. It mirrors the LifeOS pattern: env-driven crossSubDomainCookies.

**File:** `~/evergreen-core/lib/auth/index.ts`

**Find:**

```typescript
  advanced: {
    database: {
      generateId: "uuid",
    },
  },
```

**Replace with:**

```typescript
  advanced: {
    database: {
      generateId: "uuid",
    },
    ...(process.env.BETTER_AUTH_COOKIE_DOMAIN?.trim()
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: process.env.BETTER_AUTH_COOKIE_DOMAIN.trim(),
          },
        }
      : {}),
  },
```

That's it. One block added. Local EC dev is unaffected because the env var is unset locally.

Commit and push EC:

```
cd ~/evergreen-core
git add lib/auth/index.ts
git commit -m "Production crossSubDomainCookies config (env-driven)"
git push
```

If EC auto-deploys via Coolify, this will land in production once you set the env var in Step 5.

---

## Step 4 — DNS

Confirm `lifeos.evergreenwellnessmktg.com` resolves to your M90t.

If you have a wildcard `*.evergreenwellnessmktg.com` A record pointing at M90t already, no DNS change is needed. The wildcard cert (Let's Encrypt via DNS-01 from Namecheap or wherever) should auto-cover the new subdomain too.

Verify:

```
dig lifeos.evergreenwellnessmktg.com +short
```

Should return your M90t public IP (or whatever's serving wildcard subdomains today).

---

## Step 5 — Coolify config

Open Coolify in the browser. Steps:

### 5a — New Application

- Click "+ New Resource" → "Application"
- Source: "Public Repository" or "Private Repository" depending on your repo visibility
- For private: set up a deploy key — Coolify generates an SSH key, you add it to GitHub repo settings → Deploy keys
- Repo URL: `git@github.com:<your-username>/lifeos.git`
- Branch: `main`

### 5b — Build settings

- Build pack: `Dockerfile`
- Dockerfile location: `./Dockerfile` (default)
- Context: `.` (default)

### 5c — Network

- Domain: `lifeos.evergreenwellnessmktg.com`
- Port (inside container): `3001` — this matches our Dockerfile `EXPOSE 3001` and `PORT=3001`
- HTTPS: enabled (Coolify uses Traefik with the wildcard cert)

### 5d — Environment variables

Add these in the Coolify env panel. Copy values from `~/evergreen-core/.env.local` where indicated:

| Key | Value |
|---|---|
| `DATABASE_URL` | (copy from EC `.env.local`) |
| `BETTER_AUTH_SECRET` | (copy from EC `.env.local` — must match EC) |
| `BETTER_AUTH_COOKIE_DOMAIN` | `.evergreenwellnessmktg.com` |
| `NEXT_PUBLIC_APP_URL` | `https://lifeos.evergreenwellnessmktg.com` |
| `NEXT_PUBLIC_EC_URL` | `https://app.evergreenwellnessmktg.com` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://lifeos.evergreenwellnessmktg.com` |
| `NODE_ENV` | `production` |

Optional — only if you want the AI Coach in production:

| Key | Value |
|---|---|
| `LIFEOS_LLM_BASE_URL` | `http://192.168.4.200:11434/v1` (or wherever Ollama is) |
| `LIFEOS_LLM_API_KEY` | `ollama` (any string is fine for Ollama) |
| `LIFEOS_LLM_MODEL` | `qwen2.5:32b` (or whatever's pulled) |

Note: the LLM URL has to be reachable from the Coolify container. If Ollama is on M90t too, the host IP works. If on Framestation, make sure firewall allows it.

### 5e — Also update EC's environment variables

In Coolify, find the existing Evergreen Core app, edit env vars, add:

| Key | Value |
|---|---|
| `BETTER_AUTH_COOKIE_DOMAIN` | `.evergreenwellnessmktg.com` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://lifeos.evergreenwellnessmktg.com` (or append if it already has values, comma-separated) |

EC will redeploy with the new env. After it's up, EC's session cookies will use the shared domain.

---

## Step 6 — Deploy

Hit Deploy on the LifeOS app. Watch the build logs. First build takes a couple of minutes (downloads Next 16 + deps, builds standalone bundle, layers the image). Subsequent deploys are faster because of Docker layer caching.

Look for:
- `pnpm install` succeeds
- `pnpm build` succeeds (`Compiled successfully`)
- Final image starts the standalone server on port 3001
- Coolify health check passes

---

## Step 7 — Smoke test

### 7a — App loads

In a private/incognito window: `https://lifeos.evergreenwellnessmktg.com`

Should redirect to `https://app.evergreenwellnessmktg.com/auth` because no session yet.

### 7b — Sign in via EC

Sign in over at EC. Cookie gets set on `.evergreenwellnessmktg.com`.

### 7c — Bounce back to LifeOS

Visit `https://lifeos.evergreenwellnessmktg.com` again. Should land on Today, sidebar showing your name + email at the bottom. **This is the SSO win.**

### 7d — End-to-end loop

Click `/morning`, run the wizard. Reload Today — manifesto should persist.

```
psql "$(grep ^DATABASE_URL ~/lifeos/.env.local | cut -d= -f2-)" -c "SELECT entry_date, jsonb_pretty(morning) FROM lifeos_daily_checkins WHERE entry_date = CURRENT_DATE;"
```

Should show your real entry written from the deployed app.

### 7e — Phone test

On your iPhone:
1. Open Safari → `https://lifeos.evergreenwellnessmktg.com`
2. Sign in if not already (or sign into EC first)
3. Tap Share → "Add to Home Screen"
4. Name it "LifeOS", confirm
5. Tap the icon. It opens fullscreen.

Tomorrow morning: tap LifeOS icon, do morning manifesto from your bed. The whole point.

---

## If something goes wrong

### Build fails on Coolify

- Check the build logs. Usually a missing env var or a permissions issue on the deploy key.
- Try `pnpm install` and `pnpm build` locally to verify the repo state is clean.

### Build succeeds but app crashes on boot

- Check Coolify logs (the app's runtime logs).
- Most common: DATABASE_URL or BETTER_AUTH_SECRET unset, or pointing somewhere unreachable.
- The app throws an explicit `BETTER_AUTH_SECRET is not set` error if the secret is missing — surface that.

### App loads but redirects to /auth forever

- Cookie domain mismatch. Both EC and LifeOS need `BETTER_AUTH_COOKIE_DOMAIN=.evergreenwellnessmktg.com` (note the leading dot).
- Try: open browser dev tools → Application → Cookies → check the `better-auth.session_token` cookie. Domain should be `.evergreenwellnessmktg.com`. If it's `app.evergreenwellnessmktg.com`, EC's env var isn't applied yet.
- Both apps need to be redeployed AFTER the env vars are set.

### "Cross-origin" or trusted origin errors

- Make sure `BETTER_AUTH_TRUSTED_ORIGINS` on each app includes the OTHER app's full URL (with https://).

### LLM coach times out

- Check `LIFEOS_LLM_BASE_URL` is reachable from the Coolify container. If Ollama is on a private LAN host, the container needs network access to it.
- Easiest test from inside the container (Coolify provides a shell): `curl $LIFEOS_LLM_BASE_URL/models`

---

## After deploy

Future LifeOS pushes auto-deploy. You can keep building Phase 7, 9, 10 against the deployed app. Each push to `main` rebuilds.

Once you have a few real days of data on the deployed instance, delete the gibberish row from local dev:

```
psql "$(grep ^DATABASE_URL ~/lifeos/.env.local | cut -d= -f2-)" -c "DELETE FROM lifeos_daily_checkins WHERE morning->>'manifesto' = 'tetete';"
```
