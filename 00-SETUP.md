# LifeOS Phase 1 — Bootstrap Playbook

This folder contains the complete drop-in scaffold for `~/lifeos/` Phase 1. Follow the steps below in order. Stop at every checkpoint and paste output back into the chat before continuing.

---

## Step 0 — Pre-flight (run on M4)

Confirm you can reach EC's env and Postgres before doing anything else.

```
ls -la ~/evergreen-core/.env.local
grep -E "DATABASE_URL|BETTER_AUTH_SECRET|NEXT_PUBLIC_APP_URL" ~/evergreen-core/.env.local
```

You should see DATABASE_URL, BETTER_AUTH_SECRET, and NEXT_PUBLIC_APP_URL. Copy the values somewhere safe — you'll paste them into LifeOS's .env.local.

Test Postgres connectivity:

```
psql "$(grep ^DATABASE_URL ~/evergreen-core/.env.local | cut -d= -f2- | tr -d '"')" -c "SELECT 1, current_database()"
```

Should return `(1 row)`. If it fails, stop and debug before continuing.

---

## Step 1 — Drop the scaffold into ~/lifeos

```
mkdir -p ~/lifeos
cp -r "/Users/tylerfreund/Documents/Claude/Projects/AI backend/lifeos-v4-prototype/lifeos-phase1/." ~/lifeos/
cd ~/lifeos
ls -la
```

You should see package.json, tsconfig.json, drizzle/, lib/, app/, components/, and friends.

---

## Step 2 — Wire up env

Copy your env values into a local-only file:

```
cd ~/lifeos
cp .env.example .env.local
```

Then open .env.local in your editor and fill in the three values from Step 0:

- DATABASE_URL — exact same string as EC
- BETTER_AUTH_SECRET — exact same string as EC
- NEXT_PUBLIC_APP_URL — leave as `http://localhost:3001` for now (we'll switch to https://lifeos.evergreenwellnessmktg.com after Coolify deploy)

---

## Step 3 — Install deps + first build

```
cd ~/lifeos
pnpm install
pnpm build
```

The build should fail on the first try with errors about missing schema files — that's expected, we build them in Batch 2. Paste the install output (not the build error) back. We'll proceed.

If the install itself fails, paste that output and stop.

---

## Step 4 — git init

```
cd ~/lifeos
git init
git add -A
git commit -m "Phase 1 step 1 — bootstrap scaffold"
```

---

## Checkpoint after Step 4

Paste back:
1. The output of `ls -la ~/lifeos`
2. The output of `pnpm install` (last 20 lines is fine)
3. The git commit hash

I'll then write Batch 2 (Drizzle schema + first migration). After that, Batch 3 (Better Auth), Batch 4 (Today page), Batch 5 (Morning Manifesto), Batch 6 (Coolify deploy).

---

## DO NOT

- Edit anything in `~/evergreen-core` — Phase 10 only
- Run `pnpm dev` until Batch 4 lands (the page won't render without a layout)
- Skip the env wiring step — Better Auth fails silently with a wrong/empty secret
