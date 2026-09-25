# AI-d kit — data contract

Two public, free, ungated pages, both rendered in the browser from a JSON file in this
repository:

| Page | Data file | Renderer |
| --- | --- | --- |
| [Free stuff in promotions](free-stuff-in-promotions/) | `free-stuff-in-promotions/offers.json` | `web/shared/ai-kit-offers.mjs` |
| [Troubleshooting](troubleshooting/) | `troubleshooting/entries.json` | `web/shared/ai-kit-troubleshooting.mjs` |

Nobody writes an offer or an entry into HTML. Facts live in the JSON files, which means
no row can arrive without a date, and every row gets read by a human in a pull request.

## Before you hand work back

```bash
npm run validate:ai-d-kit
```

Exit 0 means every row is well-formed. Exit 1 lists every problem it found, one per line,
with the row index and id. Exit 2 means the file would not parse, so there were no rows to
check. To check a file somewhere else:

```bash
node scripts/validate-ai-d-kit-data.mjs --offers /tmp/offers.json
node scripts/validate-ai-d-kit-data.mjs --entries /tmp/entries.json
```

The validator imports the renderer's own rules rather than keeping a second copy, so a
file that passes here renders the way you expect. What it does **not** do is judge whether
an offer is real — that is somebody opening the page and writing down what they saw.

## offers.json

A JSON array. One object per offer:

```json
{
  "id": "kebab-case-stable-id",
  "name": "Human-readable offer name",
  "url": "https://…",
  "provider": "Provider name",
  "kind": "promotion",
  "summary": "One line: what you actually get.",
  "expiresAt": "YYYY-MM-DD",
  "lastVerifiedAt": "YYYY-MM-DD",
  "verification": {
    "status": "VERIFIED",
    "checkedAt": "YYYY-MM-DD",
    "checkedBy": "Neo",
    "observed": "Short literal note of what the checker saw on the page."
  }
}
```

- `kind` is `promotion` or `standing_tier`.
- `expiresAt` is **required** for a `promotion`. Without it the renderer cannot expire the
  row, so a promotion missing it is rejected rather than shown forever.
- `lastVerifiedAt` is **required** for a `standing_tier`, which has no expiry to show.
- `verification` is required in full — status, date, who, and what they saw. `observed` is
  the field that makes the record worth anything; "checked, looks fine" is not an
  observation.
- `example: true` is optional and marks a seed fixture. Those rows render with a visible
  EXAMPLE ROW stamp and raise a banner on the page. Remove them as real rows land; the
  banner takes itself down when the last one goes.

### The two rules, and where they live

Both are decisions in `ai-kit-offers.mjs`, on the path that chooses what to emit. They are
not CSS classes, and a stylesheet change cannot defeat them.

**Render-time expiry.** On every page load, a `promotion` whose `expiresAt` is before today
leaves the live list and moves to the withdrawn archive. No cron, no sweep, nobody deleting
a row — the page is correct tomorrow whether or not anyone opens it.

**UNVERIFIED is a visible state.** Nothing reaches the live list unless
`verification.status === "VERIFIED"`. Unverified rows render through a different function
into their own labelled section, and that function has no branch that can emit the live
styling. A row with perfect dates and no verification stays out.

Malformed rows are not skipped. They render in a "Broken records" section that appears only
when there is something wrong — a row that vanishes quietly is a row nobody fixes.

### Dates and thresholds

- **Timezone: UTC.** Every date is a plain `YYYY-MM-DD` with no time and no offset, and
  every comparison is a UTC calendar day, so a reader in Auckland and a reader in Los
  Angeles are told the same thing about the same offer.
- A promotion stays live through the whole of its `expiresAt` day and drops out when the
  UTC date passes it. The generous reading, because the alternative hides an offer that is
  still claimable.
- **Standing tiers go stale after 90 days** (`STALE_AFTER_DAYS` in `ai-kit-offers.mjs`).
  A stale tier is *not* demoted: it keeps its place and gains a visible STALE marker. One
  that was real in June is usually still real in October, and hiding it would trade a
  stale-but-useful row for an empty page.

### Keeping the rows honest over time

Expiry takes care of itself; staleness does not. A standing tier that quietly moved behind
a login wall still renders as live until somebody opens the page again, so the rows are
re-opened on a schedule — weekly Paperclip routine, per-row read windows of 14 days for
promotions and 30 for standing tiers, and a script that will not write a `checkedAt` for a
page it did not open. The procedure, the cadence and its reasoning, and how to tell whether
a firing ran are in [REVERIFICATION.md](REVERIFICATION.md).

```bash
npm run reverify:ai-d-kit                                        # probe every row, write nothing
node scripts/reverify-ai-d-kit-offers.mjs --apply --observations obs.json
```

### The upstream candidate section

The bottom of the offers page reads The Drop's promotion feed into a labelled candidate
queue. Nothing there is presented as live — it is a list of things to go and verify. Rows
move up by being checked and written into `offers.json` with a verification record.

## entries.json

A JSON array. One object per troubleshooting entry:

```json
{
  "id": "kebab-case-stable-id",
  "problem": "One-line title in the reader's words.",
  "symptom": "What they see. Verbatim error text belongs here, in a code block.",
  "cause": "Why it happens. Mechanism, not category.",
  "fix": "Specific steps, with commands or settings, and how to tell it worked.",
  "isWorkaround": false,
  "appliesTo": "Optional: versions, tools, or date the diagnosis holds for."
}
```

`isWorkaround` is required, not defaulted. An entry whose author never decided is an entry
that reads as a fix by omission, and a workaround presented as a fix is how a reader stops
looking for the cause. It renders as a visible badge either way.

Text fields accept a small markdown subset — fenced ``` blocks become `<pre><code>`,
`` `inline` `` becomes `<code>`, and blank lines separate paragraphs. Everything else is
escaped and shown literally. The subset is deliberately tiny: escaping first and then
re-introducing three known constructs cannot produce markup the author did not ask for.

This file feeds the **Curated entries** section only. The 108-entry record below it is
static HTML published from `TROUBLESHOOTING.md` and is untouched by this file — which is
also the no-JavaScript fallback for the page.

## Checking it yourself

```bash
npm run validate:ai-d-kit                       # schema
node --test scratch/tests/ai-kit-data-contract.test.js   # expiry + verification rules
node --test scratch/tests/ai-kit-reverification.test.js  # the demotion and refresh refusals
node scratch/tools/preview-ai-d-kit.mjs         # print what each section will show
```

The preview tool renders the real data files through the real modules with the real clock
and prints each section as text, reading the DOM hooks out of the HTML rather than
hard-coding them. Add `--built` to render from `vercel-public/` after `npm run build`.
