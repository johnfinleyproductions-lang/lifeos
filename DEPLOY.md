# Deploying LifeOS to Coolify

This is the NoCodeBackend build (`v2-ncb`). It is one container with no
database beside it: the data and the sign-in accounts are in the NoCodeBackend
database `54318_lifeos`, which already exists and is empty.

You can deploy this branch on its own to test it. Nothing has to be merged
into `main` first.

## 1. Point the app at the branch

In Coolify, open the LifeOS application and set its branch to `v2-ncb`. Build
pack is Dockerfile, the port is 3001, and the health check path is
`/api/health`.

If LifeOS has a Postgres resource or a `DATABASE_URL` from an earlier
deployment, this build ignores both. Leave them in place until you have
decided which version you are keeping.

## 2. Set the environment variables

| Key | Value |
|---|---|
| `NCB_INSTANCE` | `54318_lifeos` |
| `LIFEOS_SECRET` | a new random string, 32+ characters. Run `openssl rand -base64 36` and paste the result. |
| `NEXT_PUBLIC_APP_URL` | `https://lifeos.evergreenwellnessmktg.com` |
| `LIFEOS_HOUSEHOLD_CODE` | the shared code for the house, 4+ characters |
| `LIFEOS_PROFILES` | the JSON array of people, on one line. Format in `.env.example`. |
| `LIFEOS_TIMEZONE` | `America/Chicago` |

Save a copy of `LIFEOS_SECRET` in your password manager before you deploy.
Each person's sign-in is derived from it. If it is ever lost or changed,
nobody can get in until the original value is put back.

Do not add `NCB_SECRET_KEY`. The app does not use it and is safer without it.
`docs/nocodebackend.md` has the reason.

These are no longer read and can be removed when you are ready:
`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
`BETTER_AUTH_COOKIE_DOMAIN`, `BETTER_AUTH_TRUSTED_ORIGINS`,
`NEXT_PUBLIC_EC_URL`. Evergreen Core needs no change at all for this build.

The coach is optional and set up as before, with `LIFEOS_LLM_BASE_URL`,
`LIFEOS_LLM_API_KEY` and `LIFEOS_LLM_MODEL`.

## 3. Deploy and check

Deploy. The first build takes a few minutes. Then:

1. Open `https://lifeos.evergreenwellnessmktg.com/api/health`. It should read
   `{"ok":true,"db":"up"}`. That means the app is up and can reach
   NoCodeBackend.
2. Open the site. You should land on the picker, locked.
3. Enter the household code and pick your name. The first pick takes a second
   longer than later ones: it is creating your account in NoCodeBackend.
4. Run a quick morning. You should land on Today with your priorities showing.
5. Open the NoCodeBackend dashboard and look at `lifeos_daily_checkins`. There
   should be one row, with your user id on it.
6. On your phone, do the same with the same name. You should see the morning
   you just set.

## 4. After everyone has picked their name once

In the NoCodeBackend dashboard, open the `54318_lifeos` database's auth
settings and switch public sign-up off. It has to be on for the first pick of
each profile and has no use after that. Switch it back on for a moment when
you add a person.

## If something goes wrong

**The health check says down.** The container cannot reach
`app.nocodebackend.com`, or `NCB_INSTANCE` is missing or misspelled. The log
line starts with `[health]`.

**The picker shows nobody.** `LIFEOS_PROFILES` is missing or is not valid JSON
on one line. The log line starts with `[profiles]`.

**The code is right but picking a name fails.** The message on screen says
which of two things it is. If it mentions sign-up, public sign-up is off in
NoCodeBackend and this profile has no account yet. If it mentions
`LIFEOS_SECRET`, the secret differs from the one the account was created with.

**The server stops at boot.** Look for `[time]` in the log: the zone name in
`LIFEOS_TIMEZONE` is not one the runtime knows.

**Pages feel slow.** Set `LIFEOS_NCB_TRACE=1` and redeploy. The log then has
one line per request to NoCodeBackend with how long it took.

## What has not been tried

The Docker image for this build was not built in the sandbox it was written
in, which cannot reach the package registry from inside a Docker build. The
app itself was built and run there with `pnpm build` and tested against the
live database. Your first Coolify deploy is the first full image build.
