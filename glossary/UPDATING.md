# Keeping the glossary current

How a new term gets from the corpora onto <https://sdforest.site/web/library/glossary/>.

Written 2026-08-19, for whoever runs this next — including Chloé, once she can.

---

## The one rule everything else follows

`verified-terms.json` states it, and it is the reason this procedure has the shape it does:

> **The estate is the DISCOVERY source, never the AUTHORITY source.** Session transcripts,
> emails, memory files and repo docs tell us WHICH terms are worth having. They never tell us
> what a term MEANS. Anything whose meaning cannot be traced to a source below does not get an
> entry — an unverifiable entry is worse than an absent one.
>
> Adding a term: **verify first, cite second, write third.** Never the other way round.

So the job splits in two, and the split is not arbitrary — it is the line between what can be
counted and what has to be checked.

| | What it does | Automatable? |
|---|---|---|
| **Discovery** | Which terms appear often in the corpora that the glossary lacks? | **Yes.** A frequency count cannot hallucinate. |
| **Definition** | What does the term mean, and which primary source says so? | **No.** Requires finding and reading the RFC / spec / paper / vendor reference. |

## Why the existing weekly generator is not the answer

`librarian_weekly` already tries to do both halves in one pass: an LLM reads the corpora and
commits `glossary/<date>-terms.md` with definitions already written. Its record, from
`QUARANTINE.md` and the build log:

| Run | Outcome |
|---|---|
| 2026-07-19 | **Fabricated terms.** Invented `BROCKMAN` (a hiring-assessment method) and `CAVERN` (a data repository). Neither exists. Also swept in `CVV` from a payment email. |
| 2026-07-20 | Model chatter committed verbatim. |
| 2026-08-02 | **A provider error committed as the file body.** |
| 2026-08-03 | 3 terms published. |
| 2026-08-10 | 3 terms published. |
| 2026-08-16 | **A run report instead of terms.** Reached `main`; it failed to publish only because its headings were `#` rather than `##` — luck of formatting, not a control. |

Two of six runs produced nothing usable and one produced hallucinations that a human had to
catch by hand. This is structural, not a prompting problem: asked to discover a term and define
it in one step, a model that cannot find the meaning has no way to fail loudly, and a plausible
definition is indistinguishable from a real one until somebody opens the source.

**Do not fix this with a better prompt.** Split the step instead.

---

## The procedure

### 1. Propose candidates — mechanical, safe to automate

```bash
python scripts/glossary-candidates.py --min-count 5 --top 35 --out glossary/candidates-YYYY-MM-DD.json
```

Add the email corpus only if you want it (see the yield warning below):

```bash
python scripts/glossary-candidates.py --min-count 8 --top 40 --email-host opc@144.24.59.30 --ssh-key ~/.ssh/forest-a1 --out glossary/candidates-YYYY-MM-DD.json
```

The script counts how often each term appears, drops anything already in the glossary, drops the
exclusion classes that reached the published page once before (prose capitals, ambiguous
two-letter tokens, brands, estate-internal names, units, region codes, hyphenated English,
CSS properties, tracking hashes), and writes a worklist.

**Every entry it writes has an empty `desc`, `source` and `sourceUrl`, deliberately.** The build
publishes from `verified-terms.json`, and a candidates file matches none of the builder's source
patterns, so an unfilled skeleton cannot reach the site even by accident.

Measured yield on 2026-08-19 — count these yourself again if the corpora change shape:

- **Sessions: ~43%** of proposals worth writing up. The better source.
- **Email: ~10–15%.** The corpus is ~84% marketing newsletters and CI notifications, so most of
  what is frequent in it is not vocabulary. Opt-in for that reason.

### 2. Verify each candidate — judgement, do not automate

For each term you intend to keep:

1. Find the **primary source**: the RFC, the W3C/WHATWG spec, the paper that introduced the
   idea, or the vendor's own reference. Not a blog post, not a summary, not another glossary.
2. **Read it.** The citation records where the meaning came from; it is not decoration.
3. If you cannot find a primary source, **drop the term.** That is a successful outcome, not a
   failure. An entry nobody can trace is a claim wearing a definition's clothes.

### 3. Write the entry

Append to `glossary/verified-terms.json`, matching the existing shape:

```json
{
  "term": "IDF",
  "expansion": "Inverse Document Frequency",
  "desc": "Two to four sentences, plain language, ending on the consequence that makes it worth knowing.",
  "category": "Data & Knowledge Systems",
  "misread": "The common wrong understanding, stated plainly. Optional but valuable.",
  "source": "Author, \"Title\" (Publisher, Date), section",
  "sourceUrl": "https://..."
}
```

House style, taken from the entries already there:

- **`desc` is 2–4 sentences.** Say what it is, then the non-obvious consequence. Not a dictionary gloss.
- **`misread` is the most useful field in the file** and is used in about half the entries. The
  common misunderstanding, corrected, is worth more to a newcomer than a third restatement of the
  right answer.
- **`category` must come from the existing taxonomy.** Do not invent one. Current values:
  Models & Intelligence · Foundations & Concepts · Architecture & Attention · Evaluation &
  Benchmarks · Data & Knowledge Systems · Training & Fine-tuning · Compute & Hardware ·
  Inference & Serving · Cloud & Infrastructure · Protocols & APIs · Builders & Agent Platforms ·
  Prompting & Interaction · Security & Identity · Infrastructure & Networking.
- **`expansion` is `""` when the term is not an abbreviation** (Chunking, Reranking, Blockmap).
- **Append; do not re-sort the file.** Its order is thematic curation — HTTP methods together,
  then network protocols — and the build sorts for display anyway. Sorting turns a ten-line
  addition into a 700-line diff and destroys the grouping a human editor relies on.
- **Keep CRLF line endings.** `verified-terms.json` is CRLF; the generated files are pinned to LF
  in `.gitattributes`.

**Never put estate specifics in a site entry.** No absolute paths, host names, IP addresses,
ports, secret names, agent names or project names. The site is public. `PRIVATE_INFRA` in the
builder catches these for *generated* sources but exempts hand-authored ones on purpose, so for
`verified-terms.json` the discipline is yours, not the tool's. Estate-specific context belongs in
the private companion document instead — see "The two audiences" below.

### 4. Build and check

```bash
node scripts/build-glossary-bundle.cjs
```

Confirm in the output that:

- `PUBLISHED` rose by exactly the number of terms you added.
- The count of entries carrying a source citation rose by the same number.
- Nothing new appeared in the `QUARANTINE.md` warnings.
- `privateInfraDropped` is `0`.

### 5. Branch, PR, deploy

```bash
git checkout -b feat/glossary-<topic>
git add glossary/verified-terms.json web/library/glossary/glossary-bundle.json
git commit
gh pr create
```

Never commit to `main`. Deployment is Vercel on merge — `vercel.json` runs
`npm run vercel-build` (`node build-vercel-static.cjs`) and serves `vercel-public/`. **Merging
the PR publishes the change.** There is no separate deploy step to forget, and no staging gate,
so review is the only gate.

---

## The two audiences, and why entries differ between them

The same term is written up twice, for two readers, and the difference is not accidental.

| | `glossary/verified-terms.json` → the public site | `D:\output\GLOSSARY.md` → private, fed to NotebookLM |
|---|---|---|
| Definition from | A primary source, always cited | The same definition |
| Estate specifics | **Never** — public page | **The point of the file** — where the term shows up in Ivan's own systems, with the concrete example |
| Length | 2–4 sentences | As long as the example needs |
| Unresolved terms | Omitted entirely | Listed explicitly, with what was searched |

A term with no primary source — `trajectory view`, `gift key`, supersession as implemented here —
goes in the private document only. It is real, it matters, and it still does not belong in a
public glossary that promises every entry is traceable.

---

## What Chloé can own today, and what she cannot

**Can run unattended:**

- Step 1, the candidate proposer. It only reads, it writes to a file the build ignores, and it
  cannot fabricate a term because it only counts.
- Step 4, the build-and-check, including failing loudly if `QUARANTINE.md` grew or
  `privateInfraDropped` is non-zero.
- Opening the branch and PR with the candidates file attached, so a human sees the worklist.

**Cannot run unattended, and should not be made to:**

- Step 2, verification. This is the step the weekly generator already fails at. It needs fetching
  a primary source and reading it, and the failure mode when it goes wrong is a confident
  fabrication that looks exactly like a correct entry.
- Step 3, writing `desc` and `misread`. Downstream of verification; same risk.
- Step 5, merging. Merging publishes.

**The honest handover, then:** Chloé proposes and prepares; a human — or an agent that has
actually fetched and read the source — verifies and merges. When she can reliably fetch a
primary source, quote the sentence that supports her definition, and *decline* when she cannot
find one, step 2 moves to her. Declining is the capability that matters, and it is the one to
test for before handing it over. Until then, an unfilled candidates file is the correct output
and is not a shortfall.
