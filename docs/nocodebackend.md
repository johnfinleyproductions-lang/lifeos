# LifeOS on NoCodeBackend

LifeOS keeps its data and its sign-in accounts in a NoCodeBackend (NCB)
database. This is the account of how that works, what was found by testing
the live service, and what to do when something needs to change.

The database is `54318_lifeos`, in NCB's US region, created with native user
auth on. NCB's own guides and the schema it reports are saved as issued under
`docs/ncb/`.

## What lives where

NCB holds eleven `lifeos_*` tables and its own `ncba_*` auth tables. To every
data table it adds two columns: an integer `id`, and `user_id`, which it fills
from the signed-in session on every insert and filters every read by.

Nothing runs between the app and NCB. There is no database container, no
connection string and nothing to migrate on boot. The app's server makes HTTPS
requests to `app.nocodebackend.com`; the browser never does.

Under NCB is MariaDB, which matters in four places. Instants are kept to the
second. Text comparison ignores case. Booleans are 0 and 1. There is no JSON
column type, so the morning and evening sheets, protocol payloads and the
compass's nested parts are stored as text. `lib/db/codec.ts` handles all four,
and the long-text columns were widened to hold 16 MB rather than the 64 KB
they were created with.

Three unique rules carried over from the Postgres schema and are enforced by
the database: one check-in per person per day, one completion per habit per
day, one compass per person.

## Sign-in

The household code and the profile picker are unchanged. What changed is what
picking a name does.

NCB's native auth wants an email and a password per account. LifeOS has no
passwords for people to remember, so the server derives one for each profile
from `LIFEOS_SECRET` and the profile's email, and uses it to sign that profile
in to NCB when the picker asks. The first time a profile is picked there is no
account yet, and one is created with the same derived password. The resulting
NCB session token is kept in an http-only cookie, `lifeos_session`, and replayed
to NCB from the server on each request.

A person counts as signed in only when the signed profile cookie names a
profile on the list **and** NCB confirms a live session for the account that
profile's email names. A profile cookie from one person on top of another
person's session is refused.

Three things follow.

**`LIFEOS_SECRET` must not change.** A new secret derives new passwords and NCB
refuses them. No data is lost; restoring the old secret fixes it, as does
resetting that user's password in the NCB dashboard. Do not delete the user to
start over: deleting a user in NCB deletes every row that person owns. That
was seen when the test accounts were removed.

**Public sign-up is off, and has to be switched on to add a person.** A
profile's account is created the first time its name is picked, and NCB only
allows that while public sign-up is on for the database. It is off now. To
add someone: switch it on in the NCB dashboard (or ask Claude to, with the
NoCodeBackend tools connected), have them pick their name once, and switch it
off again. Picking a name that has no account while it is off says exactly
that on the picker.

It is kept off because NCB's data API accepts any signed-in account, and with
sign-up on anyone who knows the database name can make one. Such an account
cannot read anyone else's rows, and cannot get into the app without the
household code and a place on the profile list, but it could fill the tables
with rows of its own. This repository is public and names the database.

**Sessions last seven days at NCB.** When one ends the person lands on the
picker and taps their name again.

## How a query becomes requests

The app was written as about a hundred small SQL queries. Those calls are
unchanged:

```ts
db.select().from(lifeosHabits)
  .where(and(eq(lifeosHabits.userId, user.id), eq(lifeosHabits.archived, false)))
  .orderBy(asc(lifeosHabits.createdAt));
```

`lib/db/` carries them out over NCB's REST API in three steps.

1. **Plan.** The parts of the condition NCB can filter on become query
   parameters, so less comes back. Anything MariaDB and the app might disagree
   about is left out: "not equal" on text, "is null", `LIKE`, and instants with
   milliseconds are rounded outward.
2. **Check ownership.** Every row returned must belong to the signed-in person.
   If one does not, the read throws. The same check runs before an update or a
   delete touches anything.
3. **Apply the whole query again in memory.** The full condition, the ordering
   and the limit are applied to what came back. What NCB filtered is only ever
   a saving, never the meaning of the query.

Writes go by id. An update or delete with a condition reads the rows it
applies to and then changes exactly those. Deleting a habit deletes its
completions, and deleting a journal entry deletes its open loops; NCB has no
foreign keys, so those cascades live in `lib/db/index.ts`.

## What testing the live service found

These were observed on 9 November 2026 with two test accounts, A and B, each
owning one row in the same table. They are why three lines of
`lib/db/transport.ts` look the way they do. NCB may change any of this, which
is why the ownership check above exists whatever the transport does.

**1. With the database secret key attached, one person was served another's
rows.** NCB's guide has the server send the secret key on every data request
alongside the session cookie. Done that way, a read by B followed within two
seconds by the same read from A returned B's row to A:

```
B, then A after    0 ms:   B sees B's row | A sees B's row
B, then A after 1000 ms:   B sees B's row | A sees B's row
B, then A after 1500 ms:   B sees B's row | A sees B's row
B, then A after 2000 ms:   B sees B's row | A sees A's row
```

Answers are remembered for about two seconds, keyed on the URL, and with the
key attached that memory is shared between sessions.

**2. The secret key on its own returns everyone's rows.** A request with the
key and no session cookie, or an invalid one, came back with both A's and B's
rows. The guide says such a request is refused. So an expired session in an
app that follows the guide does not fail; it reads the whole table.

**3. A read straight after a write returned the old state.** Create, then read
the same URL: the new row was missing. Update, then read by id: the old values.
This happened with and without the secret key.

What LifeOS does about them:

- It never sends the secret key. A session cookie alone is answered correctly,
  never shared between people in any test, and an invalid one gets a 401. The
  key is not in the app's environment at all.
- Every read URL carries a filter that changes nothing but the URL
  (`id[ne]=-<number>`, or the same number added to an `id[in]` list), so no
  remembered answer can be served. This removes the stale reads. The number
  is random, so nobody else can ask for the same URL on purpose.
- It never uses NCB's read-by-id path, which is remembered the same way and
  has no room for such a filter.

If you use the secret key in other NCB projects, findings 1 and 2 apply to
them as much as to this one, and are worth raising with NoCodeBackend.

## What from NCB's guide was left out

The guide is written for customer-facing apps where the browser talks to NCB
through proxy routes. LifeOS does not work that way, so these were not built:

- `/api/auth/[...path]`, the browser-facing auth proxy. Sign-in happens on the
  server when a profile is picked.
- `/api/data/[...path]`, a general data proxy. The app's own routes each do
  one validated thing; a general proxy would let a signed-in browser run any
  create, update or delete on any table.
- `/api/public-data`, the auth-providers endpoint and the Account component.
  There are no public pages, no choice of sign-in method and no customer
  accounts to manage.
- The secret key, for the reasons above.

No access policy was set on any table, which leaves all of them private.

## Changing the schema

1. Add the column in NoCodeBackend: in the dashboard, or by asking Claude with
   the NoCodeBackend tools connected. Use `DATETIME` for instants, `DATE` for
   days, `MEDIUMTEXT` for long writing or JSON, and leave it nullable.
2. Add it to the table's file under `lib/db/schema/`.
3. Save the new schema to `docs/ncb/schema.json` so the repo matches the store.

A request that names a column NCB does not have fails with a 500, so step 1
comes before deploying step 2. For a new table, give it no `id` and no
`user_id`; NCB adds both.

## Limits to know about

- **Speed.** Each query is one HTTPS round trip of roughly a tenth of a second.
  Today makes about eighteen and renders in half a second to a second. Most
  other pages make between one and nine.
- **No transactions.** A route that writes twice can be interrupted between
  the two. The unique rules stop the cases that would matter most, a doubled
  check-in or a doubled habit completion.
- **500 rows a page.** Larger reads are paged automatically.
- **Seconds, not milliseconds.** Instants are cut to the second on the way in.
- **Availability.** If NCB is down or unreachable, so is LifeOS. `/api/health`
  reports it.
- **Privacy.** Everything, the journal included, is stored on NoCodeBackend's
  servers. The coach still cannot read the journal; that wall is in the app.

## How this build was verified

`pnpm check` runs 88 time checks and 26 data-layer checks with no network. The
last data-layer check runs 3,000 random queries through the layer against a
stand-in that behaves like NCB (case-blind text, 500-row pages, missing values
sorted first) and compares each answer with the query's plain meaning.

Against the live database, a browser run of 34 checks covered: signed-out
access; picker sign-in; a quick morning through the interface; striking and
un-striking a priority with an immediate reload after each; habits, focus,
journal, quests, compass and the evening shutdown; all sixteen pages on desktop
and phone with data in them; a second person seeing none of the first's Today,
habits or journal, and being refused when editing, deleting or toggling the
first person's rows by id; twenty simultaneous loads of the same page by both
people; one person's profile cookie on another's session; and a replay of
cookies after sign-out. All 34 passed. The test accounts and their rows were
removed afterwards, every table was confirmed empty, and public sign-up was
switched off.
