# AI-d kit — re-verification

Render-time expiry handles the offers that announce their own death: a promotion past
`expiresAt` leaves the live list on every page load, with nobody in the loop. This is the
other half. A standing free tier never expires, but it shrinks, moves behind a login wall,
or turns into a pricing page — and the row keeps saying what was true in June. A
promotion's stated end date can also simply be wrong.

So the rows get re-opened on a schedule, and what the checker saw gets written down.

## The rule the machinery exists to protect

**Never write a `checkedAt` for a page that was not actually opened.** A routine that
refreshes dates without looking is worse than no routine: it launders stale data into
fresh-looking data, and the page then lies with more confidence than before.

That is why the work is split in two, and why the split is a set of refusals in
`scripts/reverify-ai-d-kit-offers.mjs` rather than an instruction in this file:

| | Who | What it may write |
| --- | --- | --- |
| **Probe** | the script, automatically | Demote a row to `UNVERIFIED` on hard evidence. Nothing else. |
| **Read** | Neo, opening the page | Refresh `checkedAt`, `observed`, `lastVerifiedAt`, `expiresAt`, `url`. |

The probe cannot promote a row, cannot refresh a date, and cannot demote on a soft signal.
The read cannot happen without an `observed` note, and the script refuses the note if this
run did not open the page it describes.

## Cadence

**Weekly, Mondays 07:00 UTC** — Paperclip routine "AI-d kit offer re-verification
(weekly)" (`4a5dfeab-23f9-48c9-9fe2-dac0f4da8264`), assigned to Neo. Registered
2026-09-25; first firing 2026-09-28 07:00 UTC.

The routine fires weekly; the *rows* have their own windows, so a firing is small:

| Row | Re-read every | Why |
| --- | --- | --- |
| `promotion` | 14 days | The volatile kind. A stated end date can be wrong and a window can be pulled early, and there is no second date to fall back on. |
| `standing_tier` | 30 days | A third of the renderer's 90-day `STALE_AFTER_DAYS`. A row only reaches a reader marked STALE if this routine has been broken for two whole cycles — and then the page says so out loud. |
| anything `UNVERIFIED` | every firing | That is the queue. Either it comes back or the record of why it did not gets better. |

Every firing probes **all** rows, because one GET each is cheap and it is what catches a
404 within a week. Only the due rows plus anything the probe flagged get read by a human,
which is the expensive part. In practice that is a handful of rows a week, not 34.

Why not daily: pages do not change daily, back-to-back probing invites rate limiting, and
a firing that produces an issue with nothing in it trains everyone to ignore the ones that
matter. Why not monthly: a 404 would sit on a public page for up to a month.

**Timezone is UTC**, the same clock the renderer compares dates on, so a `checkedAt`
written by a firing can never be a day off from what the page computes.

Policies, and the reasoning:

- `concurrencyPolicy: skip_if_active` — if last week's sweep is still open, do not stack a
  second one. The open issue already picks up everything that has come due.
- `catchUpPolicy: skip_missed` — due windows are computed from the data, not from the
  firings, so the next sweep fully supersedes a missed one. Replaying missed firings would
  create duplicate work and no extra information.
- `activityGatePolicy: always` — offers rot whether or not the company is busy. This is
  precisely the routine that has to run on a quiet week.

### The routine's definition

Kept here so the schedule is reviewable in the repo and reproducible if the routine is
ever lost or has to be rebuilt. Paperclip only lets an agent create a routine assigned to
itself, so this is registered by Neo under his own identity, not by whoever wrote the
script.

```json
POST /api/companies/{companyId}/routines
{
  "title": "AI-d kit offer re-verification (weekly)",
  "assigneeAgentId": "{Neo}",
  "projectId": "{the sdforest project}",
  "priority": "medium",
  "status": "active",
  "concurrencyPolicy": "skip_if_active",
  "catchUpPolicy": "skip_missed",
  "activityGatePolicy": "always"
}

POST /api/routines/{routineId}/triggers
{ "kind": "schedule", "cronExpression": "0 7 * * 1", "timezone": "UTC" }
```

As registered: routine `4a5dfeab-23f9-48c9-9fe2-dac0f4da8264`, schedule trigger
`92a4178c-def8-4bd3-8eec-ba0ae04a0f6b`. The `description` field carries the procedure
below in short form, so a firing is readable without opening this file — if the procedure
here changes, change it there too.

## What a firing does

The execution issue Paperclip creates is the worksheet. Neo runs two passes.

### 1. Probe — writes nothing

```bash
node scripts/reverify-ai-d-kit-offers.mjs --report-out reverify-report.json
```

One read-only GET per row. Each becomes one of three verdicts:

- **`reachable`** — HTTP 2xx with a real page. This is *not* verification; it only means
  the page is openable and somebody can read it.
- **`gone`** — HTTP 404/410, or a redirect from a normal URL into a sign-in or pricing URL.
  Hard evidence. This is the only verdict that changes the file on its own.
- **`inconclusive`** — 401, 403, 429, 5xx, a timeout, a DNS failure, or a 200 with almost
  no text in it. Handed to a human, never demoted. A bot-blocking CDN and a withdrawn
  offer look identical from a fetch — `oracle.com/cloud/free` already 403s this repo while
  the offer is entirely real, and demoting on that would fill the unverified section with
  live offers until the reader stops believing the distinction.

Reachable rows also print advisory signals ("the provider name is no longer in the page
text", "the stated `expiresAt` is not written on the page"). Those are reasons to look.
They never change anything by themselves, because a JavaScript-rendered page fails all of
them while being perfectly fine.

Exit code: `0` nothing needs a human, `1` something does and it is listed, `2` could not run.

### 2. Read the flagged rows, then apply

Open each due or flagged page — **read only, never transact.** No signups, no account
creation, no payment details, no form submissions. Write one observation per row you
actually opened:

```json
[
  {
    "id": "supabase-free-plan",
    "observed": "Pricing page Free column still reads 500 MB database, 5 GB egress, 1 GB file storage, and the 'paused after 1 week of inactivity' fence is still on the same card.",
    "checkedBy": "Neo"
  },
  { "id": "some-promotion", "observed": "Banner now reads 'offer ends 30 November 2026'.", "expiresAt": "2026-11-30" },
  { "id": "moved-offer", "observed": "Old URL 404s; the same free tier is now documented at the pricing page.", "url": "https://example.com/pricing" },
  { "id": "blocked-offer", "observed": "Fetch is blocked, but the browser shows the $100 credit is still offered on new accounts.", "openedManually": true },
  { "id": "dead-offer", "observed": "The free tier section is gone; the page now only lists paid plans from $20/month.", "status": "UNVERIFIED" }
]
```

```bash
node scripts/reverify-ai-d-kit-offers.mjs --apply --observations observations.json
```

`observed` has to be an observation: at least 40 characters, and "ok" / "looks fine" /
"still there" are rejected as verdicts rather than observations. Then the script refuses,
loudly, rather than writing a date it cannot stand behind:

- **The id is not in `offers.json`** → refused. Applying it would write a date nowhere.
- **The probe says `gone` but the observation says live** → refused. One of the two is
  wrong and guessing picks the wrong one half the time. Resolve it with the working `url`
  (which the script then opens itself) or with `status: "UNVERIFIED"`.
- **The probe could not open the page** → refused unless the observation says
  `"openedManually": true`. That flag is the whole rule, expressed as a refusal.
- **A replacement `url` nobody opened** → refused. The claim is about the new page, so the
  new page gets probed too; a typo in the new link is caught here instead of published.
- **The result would be schema-invalid** → nothing is written at all.

A demotion never advances `lastVerifiedAt` — that field records the last time the offer
was seen to be *real*, and a 404 is the opposite of that. A demotion also keeps the old
observation inside the new one, so the row still says what it used to say and when.

Nothing is ever deleted. Demoting to `UNVERIFIED` is what makes the change visible: the
row moves out of the live list into the labelled unverified section, and the reader can see
that something that used to be there has stopped being true.

### 3. Commit and hand back

```bash
npm run validate:ai-d-kit
node --test scratch/tests/ai-kit-reverification.test.js
git commit -m "chore(ai-d-kit): re-verification sweep <date>"
```

## How to tell whether a firing ran

Three places, in increasing order of "and I only have the repo":

1. **The Paperclip routine's run list** — `GET /api/routines/{routineId}/runs`, and the
   execution issue each firing created.
2. **`free-stuff-in-promotions/reverification-log.ndjson`** — one append-only JSON line per
   run, written whenever the script is invoked with `--apply` (and on demand with `--log`).
   The last line tells you when it last ran, how many rows it probed, the verdict counts,
   and which ids it demoted, refreshed, or refused. NDJSON because two sweeps should never
   conflict in a merge.
3. **The data itself** — `verification.checkedAt` on the rows. If the newest `checkedAt` in
   `offers.json` is months old, the routine has not been running, whatever anything else
   claims. That is the check that cannot be faked by a routine that fires and does nothing.

A quiet week still leaves a line in the log: running `--apply` with no observations writes
the counts and changes nothing, which is how "it ran and there was nothing to do" is
distinguishable from "it did not run".
