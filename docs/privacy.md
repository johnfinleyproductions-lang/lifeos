# Who can read what

LifeOS keeps one kind of writing private by design: the **journal** (entries
and the open loops drawn from them). This page writes the rule down, and
`scripts/check-privacy.mjs` (run by `pnpm check`) holds the code to it.

## The rule

Access to private writing is a spectrum, not a switch. *Data Governance: The
Definitive Guide* (Eryurek et al., p. 64) describes partial access as a range:
nothing at all, then counts or shapes only, then a masked version, then the
full text. Each part of LifeOS sits at one fixed point on that range.

| Part | What it may know about the journal | Where |
|---|---|---|
| **The coach** (chat and its context) | **Nothing.** Not the text, not counts, not whether an entry exists. | `lib/coach/**`, `app/api/coach/**`, `app/coach`, `components/coach` |
| **Insights** | **One count:** how many entries were tagged as decisions in the window. No entry text leaves the query. | `lib/insights/queries.ts` |
| **Export** | **Everything**, for the person themself, as their own copy. | `lib/export/build.ts` |
| **The journal pages** | **Everything**, for the person signed in to that profile. | `app/journal/**`, `app/api/journal/**` |

The coach tells the model the same thing in its instructions
(`lib/coach/system-prompt.ts`), but an instruction is a request to a model.
The rule above is about what the model is never given in the first place.

## How the test holds it

`scripts/check-privacy.mjs` starts from every file in the coach's folders and
follows each import (`@/…` and relative), through as many hops as it takes.
It fails if any module it reaches:

- names a journal table (`lifeosJournalEntries`, `lifeosOpenLoops`, or their
  table names) in code, or
- lives under `lib/journal/`.

Comments don't count, so a file can still say what it must not do.
`lib/db/` is allowed to name the tables: it registers every table for the
store and reads none on the coach's behalf.

The test was checked against two deliberate breaks on 2026-11-16:

1. adding the journal table to the coach's context imports, and
2. importing the Insights queries into the coach.

Both failed with the import path that reached the table, for example
`lib/coach/llm.ts -> lib/insights/queries.ts`. The second matters most. Even
the count-only access Insights has would cross the wall if the coach came to
depend on it.

## Changing the rule

Giving the coach any view of the journal, even a count, is a product decision.
Make it here first, in the table, then change the test to match. Never change
the test alone.
