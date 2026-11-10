# LifeOS: the owner's guide

Everything the person who owns this install needs, in one place: what LifeOS
is, where each copy runs, where the data lives, the settings that matter, how
to add a person, update, back out, and fix the usual problems.

Written 9 November 2026 for the NoCodeBackend build (branch `v2-ncb`).
The other docs go deeper on single topics and are linked where they apply.

---

## 1. What it is, in one paragraph

LifeOS is a personal daily operating system for the household: a morning
page, an evening shutdown, habits, focus sessions, quests, a compass, an
ideal week, a journal, a weekly review, optional experiments, and a coach.
Several people share one install. Each device enters a household code once,
then each person taps their name. There are no passwords to remember.
It is a Next.js 16 app with no database of its own: every row lives in a
NoCodeBackend database, `54318_lifeos`, which the app's server talks to over
HTTPS.

---

## 2. Where it runs

There are three copies of the app. All the new-build copies share the same
data, because the data is in NoCodeBackend, not in any copy.

| Copy | Where | Address | Data | Status |
|---|---|---|---|---|
| **Home server** (main one) | m90t, a Coolify app built from `v2-ncb` | `https://m90t.tailf4ba1f.ts.net:8444` (your tailnet only) | NoCodeBackend `54318_lifeos` | live, healthy |
| **Mac app** | Tyler's Mac mini, `/Applications/LifeOS.app` | its own window (internally `127.0.0.1:3187`) | NoCodeBackend `54318_lifeos` | working |
| **Old LifeOS** | m90t, Coolify app `rky0c51mvpv2fan7r4p0jj7f`, branch `main` | was `lifeos.evergreenwellnessmktg.com`; that public name no longer resolves | the old Postgres database on m90t | still running, kept on purpose until retired |

The old LifeOS is the Postgres + Better Auth version. It does **not** share
data with the other two. Anything written there stays in Postgres.

### How the phone reaches the home server

```
iPhone (Tailscale on) ──► https://m90t.tailf4ba1f.ts.net:8444
                         │  tailscale serve, inside the tailscale-m90t container
                         ▼
                   127.0.0.1:3011 on m90t   (bound to m90t only, not the LAN)
                         ▼
                   LifeOS container :3001  ──HTTPS──► app.nocodebackend.com
```

Nothing is on the public internet. Only devices signed in to the
`johnfinleyproductions@gmail.com` tailnet can open the address. Your iPhone
(`iphone173`) is already one of them.

### Put it on the phone's home screen

Open the address in Safari with Tailscale switched on, tap Share, then
**Add to Home Screen**. It opens like an app. If the page will not load,
check that Tailscale is connected on the phone first.

---

## 3. Who can get in

There are two gates, and both are required.

1. **The household code.** Each device types it once and then stays
   unlocked for a month. Wrong guesses are rate-limited.
2. **A name on the people list** (`LIFEOS_PROFILES`). Tapping your name signs
   you in. Behind the scenes, the server derives that person's
   NoCodeBackend password from `LIFEOS_SECRET` plus their email.

Sessions last seven days at NoCodeBackend. When one ends you land back on the
picker; tap your name again.

The tailnet is a third gate in front of the home server. Someone has to be on
your Tailscale network before they can even see the picker.

---

## 4. The three values that must match everywhere

The Mac app and the home server must use the **same** values for:

| Setting | Why it must match |
|---|---|
| `LIFEOS_SECRET` | Each person's sign-in is derived from it. A different value means "wrong password" for everyone. |
| `LIFEOS_HOUSEHOLD_CODE` | Otherwise devices need different codes depending on which copy they open. |
| `LIFEOS_PROFILES` | Same names **and the same emails**. The email *is* the account. Change a person's email and they start a fresh, empty log. |

**The master copy** is the Mac's settings file:

```
~/Library/Application Support/LifeOS/lifeos.env
```

The home server's copy is in Coolify, under the `lifeos-v2-ncb` app,
**Environment Variables**.

**Keep `LIFEOS_SECRET` in your password manager.** If it is lost, nobody can
sign in. The data itself is not harmed. Putting the original value back fixes
it. So does resetting each user's password in the NoCodeBackend dashboard.

---

## 5. Settings reference (home server)

Set these in Coolify for the `lifeos-v2-ncb` app. `.env.example` explains every one
in full.

| Key | Value on m90t | Notes |
|---|---|---|
| `NCB_INSTANCE` | `54318_lifeos` | Which NoCodeBackend database. Missing means the health check reports down. |
| `LIFEOS_SECRET` | same as the Mac | Never change it. |
| `LIFEOS_HOUSEHOLD_CODE` | same as the Mac | 4+ characters. |
| `LIFEOS_PROFILES` | same as the Mac | JSON on **one line**. |
| `LIFEOS_TIMEZONE` | `America/Chicago` | A zone name, not an offset. |
| `LIFEOS_DAY_START` | `4` | The day turns over at 4am, so a 12:30am evening page files under the right day. |
| `NEXT_PUBLIC_APP_URL` | `https://m90t.tailf4ba1f.ts.net:8444` | Fixed at **build** time. Tick "Build variable" in Coolify. |
| `LIFEOS_APP_URL` | `https://m90t.tailf4ba1f.ts.net:8444` | The same address, read at start-up. |
| `LIFEOS_LLM_BASE_URL` | optional | The coach's model server, e.g. `http://192.168.4.200:11434/v1`. See section 8. |
| `LIFEOS_LLM_MODEL` | optional | The model the coach starts on, e.g. `gemma3:12b`. |

**Never set on the server:**

- `NCB_SECRET_KEY`: with it, an expired session would be answered with
  everyone's rows. Without it, the request is refused.
  `docs/nocodebackend.md` has the reason.
- `LIFEOS_INSECURE_COOKIES`: that one is for the Mac app only.
- `LIFEOS_FAKE_NOW`: a testing seam.

**No longer read** (old build only): `DATABASE_URL`, `BETTER_AUTH_*`,
`NEXT_PUBLIC_EC_URL`.

---

## 6. Where the data lives

- **Everything** lives in NoCodeBackend database `54318_lifeos`, in thirteen
  `lifeos_*` tables plus NoCodeBackend's own `ncba_*` sign-in tables. That
  includes the journal.
- Every row carries the owner's `user_id`. NoCodeBackend fills it in on write
  and filters by it on read, so one person never sees another's rows.
- The database enforces one check-in per person per day, one completion per
  habit per day, one compass per person, and one experiment mark per day.
- The app's containers hold **no data**. Deleting or rebuilding a container
  loses nothing.
- The **coach can see check-ins but never the journal**. That wall is in the
  app's code.

### Backups

Settings → **Your data** has two downloads:

- **Download to read**: one document with your journal, days, habits, focus,
  quests and compass.
- **Download the full record**: every row as stored.

Each person exports their own. Do it now and then, and keep the files
somewhere you back up. LifeOS keeps no other copy. If NoCodeBackend lost the
data, these files are what you would have.

> **Never delete a user in the NoCodeBackend dashboard to "start over".**
> Deleting a user deletes every row that person owns.

---

## 7. Adding (or renaming) a person

1. Add them to `LIFEOS_PROFILES` in **both** places, the Mac's `lifeos.env`
   and Coolify, with the same slug, name and email:
   `{"slug":"ada","name":"Ada","email":"ada@example.com","accent":"rose"}`
   The email only names the account. No mail is ever sent to it.
2. Redeploy the home server in Coolify, and quit and reopen the Mac app.
3. In the NoCodeBackend dashboard, switch **public sign-up on** for
   `54318_lifeos`.
4. They open LifeOS, enter the household code and tap their name once. That
   creates their account.
5. Switch **public sign-up off** again. It stays off because the repository
   is public and names the database.

If they reach the home server from their own phone, they also need to be on
your tailnet. In the Tailscale admin console, share the `m90t` machine with
them, or invite them as a user.

**Renaming:** change `name` freely. **Do not change `email`**, or they get a
fresh, empty log.

---

## 8. The coach

The coach talks to any OpenAI-style model server (Ollama, LM Studio,
llama.cpp, vLLM). Each person picks the model from a menu on the Coach page,
and the pick is remembered in their browser.

- **Home server:** set `LIFEOS_LLM_BASE_URL` to a server the m90t container
  can reach. The old LifeOS used Ollama on m90t
  (`http://192.168.4.200:11434/v1`, `gemma3:12b`), but **that Ollama was not
  answering on 9 Nov 2026**. Start it, or point the setting at another
  machine's Ollama, e.g. Framerstation on `192.168.4.180:11434`.
- **Mac app:** uses Ollama on the Mac by default. Change it in `lifeos.env`.

Without a reachable model server, the Coach page loads but cannot answer.
Everything else is unaffected.

---

## 9. Updating

The code lives at `github.com/johnfinleyproductions-lang/lifeos`. The
deployed branch is **`v2-ncb`**.

1. Push to `v2-ncb`.
2. In Coolify, open **lifeos-v2-ncb** and press **Deploy**. Coolify builds
   from GitHub. It takes a few minutes.
3. Check `https://m90t.tailf4ba1f.ts.net:8444/api/health`. It should read
   `{"ok":true,"db":"up"}`.

For the Mac app: `git pull`, then `./mac/build-app.sh`. Your settings file
is never touched.

Nothing is migrated on deploy. Schema changes are made in NoCodeBackend
itself; `docs/nocodebackend.md`, "Changing the schema", covers how.

---

## 10. Health and logs

| What | Where |
|---|---|
| Health | `/api/health` → `{"ok":true,"db":"up"}` means the app is serving and NoCodeBackend answers. Coolify's health check uses the same path. |
| Server log (home) | Coolify → lifeos-v2-ncb → Logs, or on m90t: `docker logs --tail 100 <container>` |
| Server log (Mac) | LifeOS menu → Show Log, or `~/Library/Logs/LifeOS/server.log` |
| Per-request timing | Set `LIFEOS_NCB_TRACE=1` and redeploy. You get one log line per NoCodeBackend call. |
| Private address list | on m90t: `docker exec tailscale-m90t tailscale --socket=/tmp/tailscaled.sock serve status` |

Log lines start with a tag that names the area: `[health]`, `[profiles]`,
`[time]`.

---

## 11. When something goes wrong

| What you see | Likely cause | Fix |
|---|---|---|
| Phone: page will not load at all | Tailscale off on the phone, or m90t down | Switch Tailscale on and check that `m90t` shows as connected in the app. |
| Health says `down` | Container cannot reach `app.nocodebackend.com`, or `NCB_INSTANCE` is wrong | Look for `[health]` in the log. |
| Picker shows nobody | `LIFEOS_PROFILES` is missing or not valid one-line JSON | Look for `[profiles]` in the log. |
| Picking a name fails and mentions **sign-up** | That person has no account yet and public sign-up is off | Section 7, steps 3–5. |
| Picking a name fails and mentions **`LIFEOS_SECRET`** | The secret differs from the one the account was made with | Copy the Mac's value into Coolify exactly, then redeploy. |
| Works on the Mac but not on the server (or the reverse) | Section 4 values do not match | Compare all three. |
| Server will not start, `[time]` in the log | Bad `LIFEOS_TIMEZONE` | Use a zone name like `America/Chicago`. |
| An evening entry landed on the wrong day | Day boundary | Check `LIFEOS_TIMEZONE` and `LIFEOS_DAY_START`. `docs/timezone.md` covers this. |
| Pages feel slow | Each NoCodeBackend call takes about 0.1s. Today makes about 18. | Normal is 0.5–1s. Turn on `LIFEOS_NCB_TRACE=1` to see the calls. |
| Coach does not answer | Model server not reachable | Section 8. |
| Everything is down at once | NoCodeBackend itself is down | LifeOS cannot run without it. The Mac app's Offline desk still takes writing and sends it later. |

---

## 12. The home-server setup, step by step (and how to undo it)

> **Status: live since 9 Nov 2026, 21:40 CT.** Coolify app `lifeos-v2-ncb`
> (uuid `nlsgb19ijtiru6ltrrzgv9wm`, project Evergreen, environment production),
> built from `v2-ncb`. Docker reports it healthy. Checked through the tailnet
> address: `/api/health` returned `{"ok":true,"db":"up"}`, the household code
> was accepted, picking a name signed in to NoCodeBackend (which proves the
> secret matches the Mac's), and Today loaded. Port 3011 does not answer from
> the LAN.

The setup on m90t:

1. A **new Coolify app**, `lifeos-v2-ncb`, from the GitHub repo, branch
   `v2-ncb`. Build pack is Dockerfile, it exposes 3001, and it has no domain.
   The health check path is `/api/health` and the **health check host is
   `127.0.0.1`**. Leave that host alone: with the default, `localhost`, the
   check goes to IPv6, the app listens on IPv4 only, and Docker marks a
   perfectly working app unhealthy. It lives in the same Coolify project as
   the old LifeOS.
2. A **port mapping** `127.0.0.1:3011:3001`, so the container is reachable
   from m90t itself and from nowhere else.
3. The **settings** from section 5.
4. A **private HTTPS address**, from a shell on m90t:

   ```bash
   docker exec tailscale-m90t tailscale --socket=/tmp/tailscaled.sock \
     serve --bg --https=8444 http://127.0.0.1:3011
   ```

Other private addresses on m90t, so you do not reuse their ports: `:443` is
Evergreen Core, and `:8443`, `:9443` and `:10000` are other apps.

**The Coolify API token** for scripts is in Core's secrets vault as
`coolify-api` (usable by Claude Code). The `COOLIFY_API_TOKEN` in think's
`~/evergreen-core/.env.local` was rejected (401) on 9 Nov 2026 and needs
replacing with the working value.

**To undo it**, in this order:

```bash
# 1. close the private address
docker exec tailscale-m90t tailscale --socket=/tmp/tailscaled.sock serve --https=8444 off
# 2. in Coolify: stop, then delete the "lifeos-v2-ncb" app
```

Nothing else changes. The old LifeOS, Evergreen Core and the data in
NoCodeBackend are not touched.

**Retiring the old LifeOS** (when you are ready): first export anything from
it that you want to keep, then stop the `rky0c51…` app in Coolify. Its
Postgres data stays in the m90t Postgres until you remove it on purpose.

---

## 13. Things to know about m90t

- **Disk.** On 9 Nov 2026 the main disk was 96% full, with 20 GB free after this deploy.
  Builds need a few GB each time. Freeing space (Evergreen need #117) keeps
  deploys from failing for no obvious reason.
- **Uptime.** The home server is only as available as m90t and its internet
  connection. The Mac app is the fallback, since it uses the same data.
- **Evergreen Core.** LifeOS appears in Core's App Hub and service registry
  as `lifeos`. That row still points at the old app and can be moved to the
  new one later.

---

## 14. Related docs

- `README.md`: the developer view (running locally, configuration)
- `.env.example`: every setting, with its rules
- `DEPLOY.md`: the general Coolify deploy checklist
- `docs/nocodebackend.md`: data, sign-in, limits, schema changes
- `docs/timezone.md`: how a day is decided
- `mac/README.md`: the Mac app
