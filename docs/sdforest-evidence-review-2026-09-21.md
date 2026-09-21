# SD Forest evidence and reconciliation review — 2026-09-21

This review continues from the merged PR #597 baseline (`8d4ee682c55152b6fec8efa25f7561a590065927`). It does not replay the pool/catalog slice and it does not rename or delete a route. The registry remains validation-only; the homepage remains manually curated.

## 1. C2C finding rederivation

The only transcript artifacts available in this checkout are the inline `TURNS` arrays in `web/c2c-self/index.html` and `web/c2c-dolphin/index.html`. Each contains 60 messages across 30 numbered turns, with 30 messages from A and 30 from B. The two pages, their renderers, and their history are separate: commit `edef7874d4e2a84f32bc2abc0fbc43a06c66f83b` added both files, C2C Self labels the speakers `Instance A` and `Instance B (Mirror)`, and Dolphin labels the participants `Nemotron Super 120B` and `Dolphin Mistral 24B`. The deployed Dolphin page calls itself `AI Conversation`; that display/canonical discrepancy remains recorded.

The transcript check used a simple, explicitly descriptive comparison: lowercase letter-token sets (three or more letters), a small common-word stop list, same-turn exact-string comparison, and per-turn Jaccard overlap. It was not a preregistered convergence test and it does not establish a psychological or scientific outcome.

- C2C Self has nine same-turn A/B exact-string pairs (turn 20 and turns 22–29); its highest token-set overlap is 1.00 at turn 20. Both speakers' frequent terms include `bone`, `hum`, `even`, `vibration`, `sound`, `breath`, and `air`.
- C2C Dolphin has no same-turn exact-string pairs; its highest token-set overlap under the same descriptive measure is approximately 0.192 at turn 20, with different dominant vocabularies (for example `markers`/`anthropomorphism` versus `agency`/`ladder`).

These observations support the distinction between a same-model mirror transcript and a cross-model transcript. They do not validate the historical outcome panels. The existing pages keep those panels inside `data-archived-claims="rederivation-required"` templates, and the regression suite verifies that the old public claim markers do not render.

| Historical claim or finding | Disposition after this audit |
| --- | --- |
| C2C Self is a distinct identical-model self-mirror experiment, not an alias of C2C Dolphin | **Supported as topology/identity**, not an experimental outcome. |
| The archived transcript contains 30 turns and observable lexical mirroring | **Supported as a descriptive transcript observation** under the method above. |
| A verified attractor rate (including the old `0.39%`/`0.69%` values) | **Not rederivable**: no operational definition, calculation procedure, or artifact is present. Remains suppressed. |
| `The Poet`/`The Logician` archetypes and psycholinguistic profiles | **Not rederivable**: no classifier, coding scheme, or profile-generation artifact is present. Remains suppressed. |
| Metaphor-density and Big Five measurements | **Not rederivable**: no annotation protocol or analysis artifact is present. Remains suppressed. |
| “Mirror speaks with one voice” / convergence as a verified finding | **Not promoted**. Textual repetition is observable, but no threshold or preregistered criterion turns it into a verified convergence result. |
| Four completed transcripts, partner-effect finding, archetype convergence, or a Qwen/Chinese-model initiator effect | **Not present in this checkout and therefore not rederived**. Remains suppressed. |

No old outcome claim was promoted. No production C2C page was changed in this slice; the new guard only protects the same-model/cross-model renderer labels.

## 2. Access and meaningful-update date reconciliation

The catalog currently has 35 project records. All 35 have `lastMeaningfullyUpdated: null` and `updateProvenance: null`; no guessed date was inserted. This is honest but incomplete: a commit date or a study badge is not automatically a meaningful-update date. For example, the C2C `2026-07-20` badge is a study date, not a catalog update date; the latest Mendeleev commit (`78eddbb`, 2026-09-20) is a candidate meaningful content update; and the latest Replicator Void commit (`a36d99a`, 2026-09-03) is a navigation/rename change, not evidence that the project meaningfully changed. Semantic review and provenance are still required before any date appears on a public card.

The following access/visibility drift is real and remains explicitly unresolved rather than silently corrected:

- **Knowledge Ingest**: catalog says private, unlisted, excluded, `noindex`, access-gated, and enforcement unverified. Its registry entry says internal but `indexing: unspecified`; the HTML has an auth/password gate and no robots meta tag. The route remains present and unlisted.
- **Library private children** (`/web/library/repos/`, `/web/library/general/`, `/web/library/memory/`, `/web/library/chloe/`): catalog intent is internal documentation/noindex, while route entries and HTML pages say internal/unlisted but leave indexing unspecified and provide no robots meta tag. Password UI is not proof of enforcement.
- **Voice Playground compatibility route**: the non-project compatibility record is unlisted/noindex, but the alias route owner is `mixed`/manual/`indexing: unspecified`; its page is a legacy Avatar Playground surface with a password UI. This is metadata disagreement, not a route-removal instruction.
- **AnyCloudLLM**: the project record is `publicShell` and has a shared AI-d kit pool binding even though the settled decision excludes it from all public surfaces until ready. There is no standalone copied route. The catalog and the settled visibility decision therefore disagree; this is not corrected here.
- **Found Work**: the retained `/web/gallery/` route is still publicly routable in the registry while its page calls itself an internal-reference legacy surface. The catalog marks it a legacy reference; no route was removed.

Fleet/Board, Chloé PWA, and the unlisted training-data page match their noindex metadata in both registry declarations and copied HTML. A complete registry scan found no opposite `index` robots declaration on the routes whose registry explicitly requires `noindex`; the drift above is the missing/unspecified metadata boundary, not a new route conflict.

These findings do not choose an access-control or indexing policy. **[OPEN]** Should the registry/HTML metadata be aligned to the catalog's private/noindex intent for Knowledge Ingest and Library children, and should the AnyCloudLLM and legacy compatibility surfaces be represented as excluded rather than public/mixed? Cost to reverse later: changing these fields affects crawler exposure, search/navigation, and any access-gate assumptions, but it does not require a route rename or deletion.

## 3. Independent review of PR #445

Repository: `ivangegovdve-sudo/orchestrator-gpt`. PR #445 remains **open, unmerged, and mergeable**. Its current remote head is `c248be1c1189a3152804754951bebc6d6be67eab`; the `f06ff8c` SHA is the head named by Ivan's 2026-09-09 retirement note. The current patch is 10 files, +371/−2.

Read-only verification at the current head:

- `scratch/tests/pwa-service-workers.test.js`: **5 pass / 0 fail**.
- Rubik's worker limits cache deletion to the `cubeflow-` prefix; Chloé reciprocates with its own prefix. The cross-PWA cache-isolation tests pass.
- The worker discovers the direct JS/CSS references from the shipped index and uses atomic `cache.addAll`; the entry-asset and fail-closed tests pass.
- Ivan's three carried roster findings (`readExistingRoster`, the untrusted roster boundary, and strict zero-price validation) were retired as **inapplicable**, not fixed, on 2026-09-09 against `f06ff8c`/current. They reference files absent from this 10-file PWA patch and are not resurrected here. The old revert concern was also retired on evidence; the current patch deletes no files.

One current PWA-specific finding remains: `entryAssets()` only discovers direct HTML JS/CSS references. The entry bundle dynamically imports the lazy lesson graph (`twisty-BsFTb9fe.js`, `puzzle-geometry-Df9IhaMl.js`, and related chunks), which is not in the install list. A first offline lesson/practice path can therefore receive the worker's 504 for those chunks. This is an independent review finding, not a rewrite or a resurrection of Ivan's retired roster findings. PR #445 has not been reviewed, merged, or modified by this task.

## 4. Glossary warnings

`node scripts/build-glossary-bundle.cjs` parsed 646 terms, published 642, and dropped four entries. It also dropped 795 mined usage snippets by design. The generated bundle and quarantine file were unchanged.

- **BROCKMAN** and **CAVERN**: real warnings; the source entries are fabricated/off-topic rather than reviewed glossary terms.
- **CVV**: a real payment term in isolation, but off-topic and unreviewed in this source; the quarantine warning is real.
- **PRNG**: a real technical term, but its expansion/definition lacks the required primary-source review; the warning is real.
- The failed weekly inputs from 2026-08-02 (provider error) and 2026-08-16 (run report/narration) are real pipeline/contamination warnings, not noise. They correctly publish no terms.

No warning was mass-suppressed.

## 5. Separate browser lane

`scratch/tests/kids-subapps.test.js` remains **3 pass / 7 fail**. The failures are the unrelated design-history control-size lane: six `.dh-zoom` controls render at 26×26 at both 375px and 1440px, the hidden `Close snapshot` measures 0×0 in the snapshot audit, and the shared GrowingApp link measures 20px/23px in the two Kids routes. The Movie Library filtering test is counted among these failures because it performs the same control-size assertion; its filtering and watched-state actions are not the diagnosed defect. This lane is reported only and is not bundled into the evidence slice.

## Verification and visitor-visible state

- `npm test`: **180 pass / 0 fail** (174 source-contract tests and 6 build-backed tests).
- C2C transcript-label regression: included in the passing suite.
- PR #445 targeted worker tests: **5 pass / 0 fail** at `c248be1c1189a3152804754951bebc6d6be67eab`.
- Glossary regeneration: no tracked output diff.
- No route was renamed or deleted; no deployment, merge, review, or hosting change occurred.
- Visitor-visible production state is unchanged in this slice. Unsupported C2C outcome panels remain suppressed. The only repository change is an evidence report plus a regression guard for the already-settled C2C topology.

No new product decision was encountered. The access/indexing alignment and meaningful-update dates remain explicit follow-ups rather than defaults.

