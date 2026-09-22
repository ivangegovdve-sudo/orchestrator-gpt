# SD Forest pool ordering

This is the ordering contract for the seven live pool surfaces. It governs the
catalog-backed listings and the pool directory; it does not replace the
homepage's manual curation or invent project content.

## Rank rule

Ranks live on the catalog records, not in HTML order:

- Each pool record has one positive integer `rank`.
- Each project record has an explicit `rank` object keyed by every pool it is
  ranked in, or `null` when it is intentionally unranked. A shared project may
  therefore have a different rank in each pool.
- A high rank is earned by the combination of completeness and interest: a
  finished, working project outranks a sketch. Rank is an ordering judgement,
  not a lifecycle status, evidence verdict, or claim of readiness.
- `rank >= FEATURED_RANK_MIN` is `featured` and receives visual weight.
  Positive lower ranks are `ranked` and use the dense list. `null` is
  `UNRANKED` and always remains in that dense list.
- Ties (including unranked entries) retain catalog insertion order as a stable
  tie-breaker. No entry is dropped because it is unranked or unfinished.

The runtime presenter derives the order and tier from `project-catalog.mjs`.
The homepage and pool footers retain complete no-script fallback links; the
shared directory presenter reorders those existing links from the same pool
catalog when JavaScript runs. Contract validation fails loudly if a rank names
an unknown pool, ranks a project outside its membership, or the rendered pool
directory does not cover all seven pools.

## Current pool ranks

`Health` 7 · `AI-d kit` 6 · `GrowingApp` 5 · `TinkerBox` 4 · `Design Gallery` 3 ·
`Artificial Self` 2 · `My Story` 1.

These values express the same completeness-and-interest rule at pool level.
Changing a rank changes the catalog-backed runtime order without editing the
project markup.
