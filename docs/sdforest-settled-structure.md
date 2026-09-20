# SD Forest settled structure — 2026-09-20

This tracked implementation record is the catalog and route implementation supplement to `SDFOREST-MASTER-PLAN.md`. It preserves Ivan's current interview and carried decisions; the master plan remains the rebuild execution document. The old plan is archived at `docs/archive/sd-forest-master-plan.md`.

## DECIDED: pools and lifecycle

All seven pools are Live, enterable and explain their purpose even without a live project. Live does not mean finished or evidence-verified. Canonical pool spellings are GrowingApp, AI-d kit, TinkerBox, Health, Design Gallery, Artificial Self and My Story. AI Research is not an eighth pool: Artificial Self is the pool, and AI Research is its research part.

The project lifecycle vocabulary is Live / Research / Experimental / In development. Metrics, readiness, claim evidence and last meaningful update are separate fields. Meaningful-update dates require actual provenance; missing dates must not become build dates. A public link does not certify readiness or claim evidence. Health, development and science claims require proportional peer-reviewed evidence, including Lobester Gym's claims. C2C conclusions must be rederived before publishing findings.

| Pool | Live projects | In development |
| --- | --- | --- |
| GrowingApp | Rubik's Teacher; Mendeleev; Manifesto for a Newborn; Math Mania / Forest Math | Lobester Gym; Kids Library |
| AI-d kit | Open Dashboard; Public round-table council; The Drop; Library (unfinished); Explore Repos (incomplete) | AnyCloudLLM |
| Health | Gym Scholar; Dyslexia Reading Platform; Audiobook Studio | FlowForm; Women's Health OS (short label Women's Health) |
| TinkerBox | Avatar Playground; Velune; Public round-table council; Fleet / Fleet Board (internal and unlisted) | Item Icon Generator; Calendar Generator; Chloé PWA; Chloé Desktop |
| Design Gallery | Poetry Space | Replicator Void |
| My Story | Chair or a Ladder (unfinished); Life in Time (unfinished) | Power Law Odyssey; We Are The Training Data |

Artificial Self contains AI Research as its research part, alongside experiment/archive material. C2C Dolphin and C2C Self retain Research archive classifications from the carried placement decision; this is not validation of their conclusions. The public round-table council is a shared member of AI-d kit and TinkerBox.

## DECIDED: identities, structure and boundaries

- Lobester Gym is the ADHD brain-exercise app, distinct from Gym Scholar. Preserve the lobe wordplay and spelling Lobester.
- Dyslexia Reading Platform and Audiobook Studio are distinct Live implementations today. Unify them on one platform in future; until merged, present them on the same Health page with separate tabs and implementation links.
- Kids Library contains movies and books, in two sections. Games are outside current scope. Math Mania / Forest Math is one catalog entry exposing companion experiences; Multiply Magic is absorbed into it.
- Explore Repos mode priority is solution mode → category exploration → shelf browsing → graphified search → capability cards → index search. repo-shelf is a mode, not a project; code-search and Repo Knowledge Base are incorporated references. AI_INIT Glossary is merged into Library, without a separate project status.
- The Drop belongs to AI-d kit and is a headline item while opening as a standalone platform. Preserve the direct `/web/morning-news/` redirect to The Drop. Homepage curation is manual; the route registry validates only.
- Design Gallery has three subcategories: Game Design, Web Design and Website History. Website History is Live and includes Evolution and Poetry Space material. Evolution is history material, not a project; Web Design Gallery is a category label. Replicator Void belongs under Game Design. Animation and VFX remain Portfolio concerns.
- My Story is narrative-first: a short personal narrative carries the page, with timeline fragments and selected project or evidence windows. Its four tree/context entries are Chair or a Ladder, Life in Time, Power Law Odyssey and We Are The Training Data. Manifesto for a Newborn is linked as Ivan-authored content; it remains a GrowingApp project, not duplicate membership. The personal narrative has not yet been provided for this implementation and must not be fabricated.
- Chair or a Ladder remains Live but needs Ivan's proper recording for speech-to-speech with Chloé's voice. Life in Time remains Live but needs a complete redesign. Ivan's final In development corrections win for Power Law Odyssey and We Are The Training Data despite older live versions.
- The narrated word poem is the default introductory tree/context entry, optional and skippable; skipping hands control over at the exact tree state, without restarting. Manifesto for a Newborn is optional and never an entry gate. This structure work does not implement the intro.
- Velune is a fork: public copy credits upstream nikhilvishwakarma00 and Ivan's audio-only YouTube path with no video. Voice Playground is absorbed into Avatar Playground.
- Chloé PWA and Chloé Desktop documentation is unpublished. Fleet / Fleet Board is one internal, unlisted item with In development, unpublished documentation. Knowledge Ingest is kept, repair-needed, private, unlisted and access-gated. Catalog visibility is not an access-control mechanism.
- Open Design is external, not Ivan's work and outside pools. Found Work is removed as a public destination and retained only as an internal legacy reference. Kids Corner is retired. Site Home is the homepage; Portfolio is a persistent site-level control outside pools. Existing routes are retained and marked, not deleted. Current URLs and hosting remain unchanged.

## Resolved investigation: C2C Self identity

Question: is C2C Self another name for C2C Dolphin, or a different-model variant?

Outcome: C2C Self is a separate identical-model self-mirror experiment. C2C Dolphin is a cross-model conversation. `web/c2c-self/index.html` identifies the same model in Instance A and Instance B (Mirror); `web/c2c-dolphin/index.html` identifies distinct Model A/Model B participants. Git commit `edef7874d4e2a84f32bc2abc0fbc43a06c66f83b` (2026-08-03) contains their separately added routes. Calling the self-mirror experiment a control relative to Dolphin is a structural interpretation.

The observed public/deployed title is **AI Conversation**, while the catalog/archive label is **C2C Dolphin**. Preserve both labels and the discrepancy; it does not alter the settled Artificial Self pool name.

This resolves identity only. No research outcomes are validated. The supplied experiment-script locations were unavailable on this machine; the scripts, four completed transcripts, psycholinguistic profiles, partner-effect result and archetype convergence have not been rederived here. Rendered conclusions are evidence of what old pages claimed, not verified findings. A Qwen/Chinese-model initiator effect is not established by the available route/history evidence. Artifact recovery and rederivation are required before publishing research findings.

## DECIDED on 2026-09-20

- **Artificial Self is the pool.** **AI Research** is the research part of that pool, not a separate pool and not the experiment/archive part.
- **The public round-table council is shared.** It appears in both **AI-d kit** and **TinkerBox**. The catalog retains AI-d kit as its primary route owner and records both pool memberships for listings and presentation.

## Required reconciliation and evidence work

These are missing facts or required work, not additional optional product decisions. Keep them visible without assigning plausible values: Hyper Trophy OS identity/pool/lifecycle; Knowledge Ingest pool/lifecycle and verified gate repair; meaningful-update dates and readiness/evidence reviews; Kids Library's two existing implementation/content/state boundaries; Library public versus personal source boundaries; existing Health handoffs and independent hosting fallback; and C2C artifact recovery/rederivation. Gym Scholar and Velune have catalog/pool entries but no verified standalone handoff in this checkout. Future evidence may expose a decision requiring Ivan; absence of evidence is not permission to make that decision now.

The shared catalog is currently a frozen module behind a reader/snapshot boundary. This implementation keeps storage replaceable; it does not settle long-term storage architecture. The catalog distinguishes product decisions, evidence/reconciliation requirements and resolved investigations so future consumers cannot treat all missing information as an open product choice.

Pool cards now expose a separate readiness projection: **Shipped** requires an enabled entry plus verified readiness and evidence reviews; explicit development, repair, or research rederivation work is **In progress**; every other unverified case is **UNKNOWN**. This projection does not alter the four-value lifecycle status and never treats a lifecycle label alone as completion evidence.

The seven pool pages now render their factual overview from `web/shared/project-catalog.mjs`: canonical pool name, Live state, settled summary, assigned-project count and the separate Shipped / In progress / UNKNOWN readiness counts. Their static shells retain only a generic no-script fallback; page copy that describes a pool is not a second hand-authored catalog.

The Design Gallery's Website History exhibit now states the settled arc directly: fear, then infatuation and finishing nothing, then over-delegation and a mess still being untangled. It keeps the real-inconvenience origin of projects and the unfinished/abandoned work visible rather than presenting a success-only portfolio.

## Current-copy drift sweep

The retained C2C Self route no longer presents Artificial Self's pool name as an unresolved decision: it now states that Artificial Self is the pool, AI Research is its research part, and C2C Self is the identical-model control distinct from C2C Dolphin. Math Mania and the retained Kids Library movie section now point back to GrowingApp; the `/web/kids/` route remains available as a retained legacy route and was not deleted. Avatar Playground labels its retained Voice Playground link as legacy because Voice Playground is absorbed into Avatar Playground.

Historical catalog dispositions, archived plan findings and retained compatibility routes may still contain retired names. They are intentionally scoped as history or compatibility evidence, not current homepage taxonomy, and are covered by the route-preservation rules.

