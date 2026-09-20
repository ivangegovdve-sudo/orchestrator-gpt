# SD Forest Master Plan

## 1. Purpose, authority, and reading rules

This is the rebuild execution document for SD Forest. It records the settled product decisions, the current repository evidence, the work dependencies, and the decisions that must be resolved before dependent implementation begins. It is a plan for the rebuild; this documentation change does not implement or release the rebuild.

### 1.1 Amendment — 2026-09-20

The later settled structure decision closes the two product questions that were open during the original plan pass: **Artificial Self is the pool and AI Research is its research part**, and the **public round-table council appears in both AI-d kit and TinkerBox**. The council keeps AI-d kit as its primary route owner while the shared catalog records both memberships. These decisions supersede any earlier wording that leaves either relationship open; other `[OPEN]` items below remain open unless separately resolved.

The source audit is pinned to repository commit `f738675600c57eeafcce26a16ac72c85300c212f`. Source files describe what currently exists. They do not override the settled target decisions below. In particular, the archived [legacy master plan](docs/archive/sd-forest-master-plan.md), the README, current homepage labels, and route-registry placement names are historical or current-state evidence, not alternative target instructions.

Reading rules:

- **DECIDED Dxx** is binding direction already settled with Ivan. Implement it without reopening the choice.
- **[OPEN] Oxx** is an unresolved choice or verification task. Resolve it explicitly and record the evidence, owner, and consequence before implementing work that depends on it.
- **CURRENT** means observed in inspected source, not independently confirmed on a running deployment. A rendered page, a status badge, or a remote link alone does not establish a functioning public product.
- The route matrix preserves every known route during planning. A future canonical destination does not authorize deleting the old route or changing a redirect now.
- There are **no implicit defaults**. Missing pool placement, lifecycle status, storage, host, URL shape, skin, or readiness evidence stays open. Illustrative field names and implementation options below are conceptual contracts, not an unannounced technology selection.
- Public deliverables must contain no secrets, credentials, private endpoints, personal machine references, or private operational configuration. The public catalog describes public documentation for internal tools; it does not expose their runtime setup.

## 2. Decision ledger

### Identity, homepage, navigation, and readiness

| ID | Settled requirement |
|---|---|
| DECIDED D01 | The seven canonical public pools are exactly **GrowingApp**, **AI-d kit**, **TinkerBox**, **Health**, **Design Gallery**, **Artificial Self**, and **My Story**. These spellings are the naming contract everywhere a pool name appears. |
| DECIDED D02 | The front page is UI first: a stable, clean forest skin, with forest expressed through edges, textures, moss, motion, and animated interiors. Pools are windows/cards. Literal-world movement is not the navigation model. The active frame animates continuously while unhovered; richer interiors wake on hover; every ready entrance is animated. |
| DECIDED D03 | Desktop interaction is hover preview, then first click to enlarge/select and reveal a small explicit **Enter**, then a second action on Enter to open. Mobile uses first tap to select and second tap on Enter to open. There is no OS-style double-click and no first-visit tutorial. Keyboard and assistive-technology equivalents must expose the same selection and explicit-entry stages. |
| DECIDED D04 | The intro is a seed burst and staged tree assembly in a lush boreal environment, resolving into the front page. Emergence is scroll-driven; Scroll World and Make Me Pulse describe the intended feeling, not a chosen implementation. The narrated **word poem** is the default tree/context entry and launch gate, but it is optional. An explicit scroll-down-to-skip cue is present. Scrolling fades narration and hands over from the exact tree progress already reached, with no restart or snapback. |
| DECIDED D05 | All pools remain visible in their normal positions. Ready pools are active. Unready pools are disabled, frozen on strong stills, with a playful hover line. Unfinished projects stay lower down, greyed and tilted as intentional **Coming Soon** entries. Within each pool, finish and polish determine ordering; Gym Scholar leads Health because it is the most finished. Readiness is a separate field from lifecycle status. |
| DECIDED D06 | The only lifecycle statuses are **Live**, **Research**, **Experimental**, and **In development**. Metrics are separate. Every card shows its last meaningful update. Live requires an end-to-end working core flow, plain-language explanation, basic accessibility and mobile usability, polish, and evidence proportionate to its claims. “Coming Soon,” “public,” content counts, and “unlisted” are not additional statuses. |
| DECIDED D07 | Before consequential Health, development, or science projects earn done/Live, they must ingest peer-reviewed evidence and connect it to their claims. This includes Lobester Gym and the dyslexia platform. The Kids Movie Library needs rigor proportionate to the claims it makes; a simple catalog is not held to the same research burden as a developmental intervention. |

### Pool entrances, page models, and tree/context

| ID | Pool or surface | Settled visual and content direction |
|---|---|---|
| DECIDED D08 | GrowingApp | Animated family/learning entrance; playful outside and calm, evidence-led inside. The interior has sense-making introduction, a research hub, and project windows. Manifesto for a Newborn is an optional introduction and is never a gate. |
| DECIDED D09 | AI-d kit | A clear, calm tool workbench using aid/safety wordplay. The main page is search-first unified search/glossary; tools are reached through results. Blocker-to-tool mapping is an additional guided mode, not the only entrance. The Matrix white-room feeling belongs inside that mapping experience. |
| DECIDED D10 | Health | A science-forward, precise, polished research clinic. Its entrance is living anatomy; the exact biological subject is [OPEN] O13. The page is project-first, with evidence inside each project, rather than a central evidence hub. Gym Scholar leads; public names include **Lobester Gym** and **Women’s Health OS**. |
| DECIDED D11 | Design Gallery | Clean museum exhibits and a museum-gallery reveal with framed exhibits. Verify the earlier entrance implementation under [OPEN] O14; do not ask Ivan to choose the already settled museum direction again. Categories include at least **Web Design** and **Game Design**. Animation/VFX are not categories here. |
| DECIDED D12 | Artificial Self | A speculative laboratory: mysterious, but scientifically grounded. **Artificial Self is the pool; AI Research is its research part**, alongside public research/archive C2C experiment material subject to rederivation. Exact project-page composition beyond these requirements remains [OPEN] O15. |
| DECIDED D13 | TinkerBox | Quiet, minimal, useful. The public round-table council is a shared member of TinkerBox and AI-d kit; the catalog records both memberships while retaining AI-d kit as its primary route owner. Detailed entrance/page composition remains [OPEN] O15. |
| DECIDED D14 | My Story | An unfinished animated timeline entrance with no triumphant ending. The page is **narrative-first**: a short personal narrative carries it, with timeline fragments and selected project/evidence windows. Tree/context entries are its content and Manifesto for a Newborn is linked. The visual language is deferred to the design pass [OPEN] O15; the content structure is settled. |
| DECIDED D15 | Roots and context | Roots are visual/narrative only; pools provide navigation. Exact root interaction is deferred to the visual pass [OPEN] O15. The four optional tree/context pieces are **Chair or a Ladder**, **Life in Time**, **Power Law Odyssey**, and **We Are The Training Data**. The narrated poem is the default but remains optional; the other pieces are optional ways to deepen the context. Their existing routes are preserved. |

### Placement, consolidation, and public boundaries

| ID | Settled placement or naming rule |
|---|---|
| DECIDED D16 | Dyslexia and Audiobook accessibility belong in **Health**. `ai-research` belongs in **Artificial Self**. Public project names are Lobester Gym and Women’s Health OS. |
| DECIDED D17 | Fleet and Fleet Board are **one Live, unlisted/internal item**, not two public projects. `chloe-pwa`, Chloé desktop, and Fleet have **public documentation only**. Public documentation must not expose internal controls, private runtime setup, or credentials. A live internal service does not make its controls eligible for public navigation. |
| DECIDED D18 | `code-search` and Repo Knowledge Base fold into **Explore Repos**. Knowledge Ingest retires or redirects; the choice and compatibility treatment are [OPEN] O08. Explore Repos’s exact pool placement is [OPEN] O05, rather than an inferred default. |
| DECIDED D19 | **repo-shelf** is a secondary, pleasing repository display inside Explore Repos: themed shelves with book width encoding stars/forks. It is neither a top-level destination nor the primary browsing mode, and it does not retain the old data-cluster taxonomy. The exact encoding and readable alternative are [OPEN] O09. |
| DECIDED D20 | **Evolution** belongs in Design Gallery → Web Design. **Math Forest** and **Math Mania** have one GrowingApp entry exposing both companion experiences; their internals are not merged. **Mendeleev** is Live in GrowingApp. Existing source labels that disagree must be reconciled during implementation, with verification recorded. |
| DECIDED D21 | **Replicator Void** belongs in Design Gallery → Game Design → Coming Soon. Animation/VFX belong only to **Portfolio**, outside the pools. |
| DECIDED D22 | **Open Design** is kept out of the public project offering; Library/Explore Repos may refer to it as reference material only. **Velune** is excluded. **AnyCloudLLM** is excluded from public surfaces until ready. Exclusion from public curation is not authorization to delete a route or source. |
| DECIDED D23 | **C2C Dolphin** and **C2C Self** are public research/archive work in Artificial Self. Public findings must be rederived first [OPEN] O07. Preserve their routes and archival context without presenting unverified interpretation as validated findings. |
| DECIDED D24 | **Library** folds into AI-d kit search; its separate destination surface is removed in the target experience, with old routes retained as compatibility paths. `/web/morning-news/` becomes a direct redirect to **The Drop**. The Drop is a headline AI-d kit member and remains a standalone publication when opened. |

### Portfolio, hosting, links, curation, and support

| ID | Settled requirement |
|---|---|
| DECIDED D25 | Portfolio is outside the seven pools. Its persistent side control appears only after the intro and uses Portfolio text/icon, with no additional promotional copy. Existing Lovable hosting opens in a separate tab now. Existing portfolio content is the baseline but must be updated before becoming canonical. |
| DECIDED D26 | Multiple public design iterations of the same canonical portfolio content are live skins on one page. An explicit switcher changes the skin in place with no navigation or position loss. Only Ivan chooses the default skin, after iterations exist [OPEN] O11. CG/VFX and coding/AI audience variants are separate, selective links rather than interchangeable visual skins. |
| DECIDED D27 | Donations are voluntary in the Buy-Me-a-Coffee spirit: a site-level lower-corner control, visible but secondary. They do not compete with project entry or become a per-pool primary action. Provider and exact presentation remain [OPEN] O18. |
| DECIDED D28 | Warn before leaving only when a separate tab or external app opens. Ordinary in-place navigation and portfolio skin switching do not trigger that warning. Lovable project hosting is deferred; The Drop and FlowForm current public URLs are retained pending later host decisions. The shared Chloé host cannot be the sole point of failure: a fallback or independent hosting is required for affected public tools. No provider is selected by this plan [OPEN] O03. |
| DECIDED D29 | Every public tool page has a plain-language explanation **above the tool**: what it does, how to start, what input leaves the browser, important limits, and how to interpret its result. |
| DECIDED D30 | Pools have a featured layer with the rest accessible through overflow/library browsing. There is **no fixed featured count** per pool. Homepage selection remains manually curated. The route registry validates all deployable routes, with separate visibility/access fields; it does not automatically determine homepage membership or order. |

## 3. Current repository evidence and honest gap list

The audit inspected `index.html`, `README.md`, the legacy plan, `build-vercel-static.cjs`, `vercel.json`, `package.json`, `.github/workflows/`, `web/shared/route-inventory.mjs`, `scratch/tests/route-inventory-contract.test.js`, and the deployed HTML page families enumerated in section 4. Page text, declared routes, shims, and embedded-service boundaries are source observations. Availability, data freshness, scientific validity, and ownership outside this repository were not established by reading those files.

| CURRENT evidence | Target relationship and required gap closure |
|---|---|
| `index.html` has four directory sections: Writing & Media, Projects & Play, Tools, and Research & Experiments. Cards are hand-authored, and another animated presentation is generated from their DOM data. | D01–D05, D30 require seven pools, deliberate entrances, the new two-stage entry, and manual curation backed by catalog records. Preserve the useful manual editorial control while removing duplicated factual project metadata [OPEN] O04, O10. |
| `build-vercel-static.cjs` copies root `index.html` and the `web/`, `calendar/`, `movies/`, `frontend/`, `public/`, and `config/` trees, plus selected data assets. It builds the glossary bundle first. The build does not select pages from the route registry. | D30 requires deployment coverage independent of public navigation. Enumerate copied files and configured redirects before testing registry completeness. Inspect non-page copied assets for their delivery role without exposing private material [OPEN] O02, O10. |
| The registry contains 28 entries and aliases, but omits physically copied pages including Fleet, Board, Chloé, Gallery, Code Search, Repo Knowledge Base, Voice Playground, Lobester Gym, Rubik’s Teacher, Chair or a Ladder, and We Are The Training Data. Nested Council routes and Open Dashboard’s MCP page are also not enumerated as aliases. | D17, D30 require ownership for unlisted/internal and child routes as well as public projects. Inclusion in validation must not imply inclusion in public navigation [OPEN] O10. |
| The archived plan calls for subdomains for major tools. The build and current route registry deliver most pages under `/web/*`, with copied-root exceptions. README describes a split static/API deployment and includes operational details that do not belong in public planning output. | D28 preserves current public handoffs without choosing the final URL or hosting architecture. Subdomains, same-origin routes, and a hybrid remain explicit options [OPEN] O01, O03. |
| `web/ai-init/index.html` redirects and declares its canonical destination as `/web/library/`. Vercel’s exact parent redirects instead target `/web/library/glossary/`. The contract test expects `/web/library/`. The embed is a separate physical page. | D24 folds Library into AI-d kit, but the exact glossary/search compatibility destination is not chosen. Reconcile host redirects, HTML shims, canonicals, and tests together without capturing the embed or glossary assets [OPEN] O08. |
| `web/llm-db/index.html` is now a Library redirect. Vercel also redirects its wildcard paths. README still describes it as a direct API-backed platform DB. `web/tinylm/index.html` is absent; registry and Vercel retain it as a redirect into Councils. | Treat documentation as stale where it contradicts inspected source. Distinguish physical pages from redirect-only families and preserve bookmarks [OPEN] O08, O10. |
| `movies/index.html` is a substantive movie catalog, while `web/kids-movie-library/index.html` is another catalog. The registry points `kids-movie-library` at `/movies/`; its test assumes `/web/.../` URLs. README calls `/movies/` a shim, which it currently is not. No `web/movies/index.html` was found in the copied source audit. | The duplicate Kids Movie routes require comparison of content, state, and user flows before choosing one canonical implementation [OPEN] O05, O08. A historical name is not evidence of an additional deployable page. |
| `web/gallery/index.html` is **Found Work**, explicitly third-party work embedded from authors’ accounts and credited to them. Its visible rule is user-initiated, one-at-a-time playback. The homepage separately has a disabled gallery concept and a Live Found Work card. | D11’s Design Gallery direction is settled, but Found Work provenance must remain explicit. Verify the prior museum implementation and determine how the existing credited shelf relates to it [OPEN] O14. Never relabel borrowed exhibits as Ivan’s own design work. |
| Mendeleev is disabled/Coming soon on the homepage while its interactive periodic-table source exists and registry placement is active. Math Forest is a placeholder with a rebuild mount point; Math Mania is an external-app frame. Replicator Void is linked as Experimental, although the target placement is Coming Soon. We Are The Training Data is a copied, noindex draft and a disabled homepage card. | Apply D05, D06, D15, D20, D21. “Copied,” “interactive,” “ready,” and “Live” are different facts. Mendeleev’s Live target is settled; verify its flows. Companion math routes stay distinct. Other readiness/status decisions require evidence [OPEN] O16. |
| Homepage badges include counts, “Static tool,” “Public,” “Live research,” and “Published research” alongside lifecycle-like labels. Metadata exists in the homepage, the route registry, and individual pages; no shared project catalog with the section 5 contract was found in those sources. | D06 and D30 require a catalog boundary, separate metrics, and meaningful update dates. Define migration and storage explicitly [OPEN] O04, O16. Existing counts must not be copied as timeless facts. |
| `web/fleet/` presents internal operations; `web/board/` is a noindex published snapshot with age checking; `web/chloe-pwa/` is a noindex personal-device client requiring user-supplied access. Library has public references beside personal sections; Knowledge Ingest describes a private ingest surface. | D17 settles public documentation only for Chloé/Fleet and a single internal Fleet item. Noindex and a page-level password UI are not proof of server-enforced access. Verify the boundary without publishing operational details [OPEN] O02, O08. |
| Women’s Health OS describes an external research corpus and live research chat. The current training page at `web/hypertrophyos/` combines a browser calculator, remote research, and an embedded dashboard with explicit fallback. Lobester Gym describes an external app and makes developmental claims. Dyslexia/Audiobook and Voice Playground also rely on companion services. | D07, D16, D28, D29 require claim-level evidence and independent usefulness or fallback. Source claims that a corpus is peer reviewed do not establish evidence quality or service availability. Gym Scholar’s relationship to the current training name must be verified [OPEN] O03, O05, O06. |
| C2C pages publish transcripts alongside attractor rates, archetypes, psychometric profiles, and claims of convergence. AI Research groups these with public Councils. | D12, D16, D23 settle the Artificial Self destination, not validity of the findings. Rederive all public findings before promoting them; keep a transparent archive record [OPEN] O07. |
| Explore Repos is a public repository index; Repo Knowledge Base is an unlisted graph-derived index; Code Search searches authored public repositories. Library has another repository search view with personal-section wording and inconsistent corpus counts across pages. | D18–D19 settle integration under Explore Repos and a secondary shelf. Source scope, freshness, provenance, access, and encoding need reconciliation [OPEN] O02, O09, O16. |
| The four context sources differ: Chair or a Ladder is an essay; Life in Time is an estimates/perspective tool; Power Law Odyssey is an interactive scrollytelling argument; We Are The Training Data is a spoken-word draft. Manifesto has an English root and nine translated pages. | D04, D08, D14–D15 settle their optional context roles. Narration, approved text, translations, factual qualifications, and exact progress handoff still need production/verification work [OPEN] O06, O12, O15. |
| `web/vfx-portfolio/` presents existing work, showreel, biography, credits, and experience with embedded media and an original-portfolio handoff. This is not proof that the material is current. | D25–D26 require one updated canonical content baseline, then public skins and selective audience variants. Ivan selects the default only after iterations exist [OPEN] O11. |
| `package.json` has build/refresh commands but no general test command. Inspected workflows cover Open Dashboard, glossary generation, free rosters, and estate synthetics; they do not form an all-route/all-project acceptance gate. | Existing specialized tests are useful. A general catalog/route/link/accessibility/readiness gate remains absent from the inspected setup [OPEN] O10. Do not claim there is no testing or no CI at all. |

Baseline diagnostic: `node --test scratch/tests/route-inventory-contract.test.js` produced **2 passing and 5 failing tests** on the pinned source. Failures cover the inventory size mismatch, missing Chloé trail, AI Init Vercel destination, a parent-link assertion, and stale Poetry/Calendar markup assumptions. These are pre-existing audit findings. Updating tests must follow reconciled ownership and requirements, not simply suppress failures. This plan does not modify those tests.

## 4. Information architecture and complete route matrix

### Target structure

**DECIDED D01/D04/D14/D15/D17/D24–D27/D30:** The intro resolves to the seven visible pool windows. Each pool has a manually selected featured layer and an accessible route to remaining entries. Portfolio and secondary donations are site-level controls outside the pools. Tree/context content enriches My Story and the intro; roots do not become another navigation system. The Drop is a member of AI-d kit that opens its standalone publication. Internal tools have public documentation where allowed and a separate internal-access boundary; its implementation remains **[OPEN] O02**.

### Matrix conventions

Each physical `.../index.html` row below covers both its directory URL and its explicit `index.html` URL. For example, `/web/gallery/` includes `/web/gallery/index.html`; `/` includes `/index.html`. This describes physical delivery families, not a settled canonical URL choice. Explicit non-index files, non-slash redirect sources, aliases, and wildcard rules are listed separately. Retain query/hash behavior where applicable and inventory asset references during route implementation.

- **R**: represented by a top-level registry entry; **A**: listed in that entry’s `aliasPaths`; **U**: physically copied but not registered as a page/alias. These are current registry facts, not target access categories.
- **Unverified [OPEN] O16** in the lifecycle column means a four-value lifecycle assignment has not been independently established. It is not a fifth status. Quoted current labels are evidence only.
- **Public shell** means source exposes a readable page without an observed page-level gate; it is not a live access/security test. **Personal/internal** describes the source’s intended boundary. Noindex is stated where observed but is not access control.
- Every row is retained through rebuild planning. Where placement is DECIDED but canonical treatment is open, both are marked. Unclassified pages remain unclassified.

### Root and top-level page families

| Current route / role / coverage | Desired pool or outside relationship | Lifecycle evidence / target | Visibility and access | Canonical disposition and authority |
|---|---|---|---|---|
| `/` — four-group homepage; outside registry | Seven pools plus site-level controls | Site surface; project status not applicable | Public | Retain root entry; rebuild per DECIDED D01–D05, D25–D30; URL details [OPEN] O01 |
| `/web/ai-research/` — research collection, R | Artificial Self | Research | Public shell | Placement DECIDED D12/D16; preserve and migrate, URL [OPEN] O01 |
| `/web/avatar-playground/` — avatar lab, R | Unclassified [OPEN] O05 | Homepage says Live; unverified [OPEN] O16 | Public shell | Preserve; pool and canonical role [OPEN] O05, O08 |
| `/web/board/` — Fleet snapshot, U | Same Fleet item, outside public pools | Live internal DECIDED D17; snapshot freshness needs verification | Unlisted/internal, noindex; public documentation only target | Co-own with Fleet DECIDED D17; documentation/compatibility route design [OPEN] O02, O08 |
| `/web/c2c-dolphin/` — AI Conversation, R | Artificial Self research/archive | Research; findings await rederivation | Public archive target; do not promote unrederived findings | DECIDED D23; preserve archive, publishing treatment [OPEN] O07 |
| `/web/c2c-self/` — self-mirror study, R | Artificial Self research/archive | Research; findings await rederivation | Public archive target; same evidence boundary | DECIDED D23; preserve archive, publishing treatment [OPEN] O07 |
| `/web/calendar/` — printable generator, R | Unclassified [OPEN] O05 | “Static tool”; unverified [OPEN] O16 | Public shell; external holiday lookup | Retain; pool [OPEN] O05, canonical relationship to copied-root shims [OPEN] O08 |
| `/web/chair-or-ladder/` — essay, U | Optional tree/context; My Story content | Published text; project status [OPEN] O16 | Public shell | Canonical public title **Chair or a Ladder**, DECIDED D15; existing slug retained, URL treatment [OPEN] O01 |
| `/web/chloe-pwa/` — personal client, U | Public documentation pool placement [OPEN] O05; runtime remains non-public | Unverified [OPEN] O16 | Current runtime internal/noindex and excluded from the public runtime offering; public documentation only DECIDED D17 | Preserve route; documentation placement and internal runtime access are separate choices; access/compatibility design [OPEN] O02, O08 |
| `/web/code-search/` — authored-code index, U | Inside Explore Repos; pool [OPEN] O05 | Unverified [OPEN] O16 | Public-repository search shell | Fold into Explore Repos DECIDED D18; old route shim or compatible subview [OPEN] O08, O09 |
| `/web/council/` — two public council modes, R | AI-d kit + TinkerBox (shared) | Live; service/evidence verification [OPEN] O16 | Public modes with declared service boundaries | Shared membership DECIDED D13; preserve both modes and child compatibility; primary route owner is AI-d kit, URL [OPEN] O08 |
| `/web/evolution/` — site design history, R | Design Gallery → Web Design | Historical exhibit; unverified [OPEN] O16 | Public shell | Placement DECIDED D20; preserve exhibit/route, integration [OPEN] O14 |
| `/web/explore/` — Explore Repos, R | Consolidated repository destination; pool [OPEN] O05 | Count badge is a metric; status [OPEN] O16 | Public repositories; future private data excluded from public results | Consolidation DECIDED D18–D19; preserve route, query/content contract [OPEN] O09 |
| `/web/fleet/` — Fleet operations, U | One Fleet item with Board, outside public pools | Live internal DECIDED D17 | Unlisted/internal/noindex; public documentation only | Co-own with Board DECIDED D17; safe documentation and access separation [OPEN] O02, O08 |
| `/web/gallery/` — Found Work, U | Relationship to Design Gallery [OPEN] O14 | Homepage says Live; unverified [OPEN] O16 | Public, credited third-party shelf | Keep provenance; museum verification and canonical exhibit relationship [OPEN] O14; D11 direction settled |
| `/web/hypertrophyos/` — Hyper Trophy OS training tools, R | Unclassified [OPEN] O05; relationship to Gym Scholar unresolved | Current “Live research”; status/evidence [OPEN] O06, O16 | Public shell; local calculator plus remote service/frame | Preserve current route; identity, pool, and canonical mapping [OPEN] O05. DECIDED D05/D10 place Gym Scholar first in Health but do not classify this route. |
| `/web/kids/` — Kids Corner aggregator, R | Unclassified container relationship [OPEN] O05; math child has settled GrowingApp placement | Current Live label; unverified [OPEN] O16 | Public shell | Preserve; do not assume the old container survives as a new pool page [OPEN] O05, O08 |
| `/web/kids-movie-library/` — family catalog, R by ID but href points to `/movies/` | Unclassified [OPEN] O05 | Unverified [OPEN] O16; evidence proportional to claims D07 | Public catalog shell; compare stored user state before migration | Duplicate implementation with `/movies/`; canonical/data reconciliation [OPEN] O08 |
| `/web/library/` — unified references, R | AI-d kit search | Current Live badge; status of integrated offering [OPEN] O16 | Public search plus links to personal sections | Remove separate Library surface in target, DECIDED D24; retain compatibility route, destination [OPEN] O08, O09 |
| `/web/life-in-time/` — time/perspective tool, R | Optional tree/context; My Story content | Current Live badge; assumptions/evidence [OPEN] O06, O16 | Public shell; personal-input handling to verify | Context DECIDED D15; retain route and review explanatory claims |
| `/web/lobester-gym/` — bilateral-coordination app handoff, U | Health | Current Live badge; consequential claims need evidence [OPEN] O06, O16 | Public introduction, external application | Public name/placement DECIDED D10/D16; host [OPEN] O03 |
| `/web/m-popova/` — Poetry Space, R | Unclassified [OPEN] O05 | Poem-count badge; status [OPEN] O16 | Public literary content; attribution retained | Preserve source identity and route; placement [OPEN] O05 |
| `/web/manifesto-newborn/` — English manifesto, R | Optional GrowingApp introduction; linked from My Story | Published text; status [OPEN] O16 | Public, never mandatory gate | Role DECIDED D08/D14; preserve root and translations |
| `/web/math-forest/` — reserved rebuild page, R | GrowingApp, shared entry with Math Mania | In development; placeholder source | Public preview; Coming Soon treatment until ready | DECIDED D05/D20; keep distinct experience and route |
| `/web/math-mania/` — external-app frame, R | GrowingApp, shared entry with Math Forest | “Live Lovable app”; external function unverified [OPEN] O16 | Public shell/frame plus full-screen handoff | Companion entry DECIDED D20; keep internals distinct; hosting [OPEN] O03 |
| `/web/mendeleev-bg/` — bilingual periodic table, R | GrowingApp | **Live DECIDED D20**; verify core flow and evidence gate | Public; disabled homepage presentation must be reconciled | Preserve experience/route; correct status/readiness presentation under D06/D20 |
| `/web/morning-news/` — The Drop intro/handoff, R | AI-d kit headline; opens standalone | Current Live badge; service verification [OPEN] O16 | Public handoff | Direct redirect to The Drop DECIDED D24; current URL retained D28; implementation later |
| `/web/open-dashboard/` — AI model/ecosystem explorer, R | Unclassified [OPEN] O05 | Homepage “Public snapshot”; status [OPEN] O16 | Public data and public MCP setup page | Preserve child routes; placement/ownership [OPEN] O05, O08 |
| `/web/power-law-odyssey/` — interactive explanation, R | Optional tree/context; My Story content | “Interactive”; claim/status review [OPEN] O06, O16 | Public shell | Context DECIDED D15; preserve route; qualify scientific/risk claims |
| `/web/replicator-void/` — native simulation, R | Design Gallery → Game Design → Coming Soon | Current Experimental; lifecycle review [OPEN] O16; readiness settled Coming Soon | Preserved route; lower, greyed/tilted project presentation | DECIDED D21; keep route, do not equate Coming Soon with deletion |
| `/web/repos/` — Repo Knowledge Base, U | Inside Explore Repos; pool [OPEN] O05 | Index processing labels are not project status; [OPEN] O16 | Unlisted/noindex current; public repositories only declared | Consolidate DECIDED D18; final visibility/subview [OPEN] O02, O08, O09 |
| `/web/rubiks-teacher/` — cube tutor/Cubeflow, U | Unclassified [OPEN] O05 | Homepage Live; unverified [OPEN] O16 | Public shell | Preserve; naming, placement, readiness evidence [OPEN] O05, O16 |
| `/web/upload/` — Knowledge Ingest, R | Retired feature or redirect; no assigned public pool | Unverified [OPEN] O16 | Intended private ingest; access enforcement unverified | Retire or redirect DECIDED D18; exact safe route treatment [OPEN] O02, O08 |
| `/web/vfx-portfolio/` — existing animation/VFX portfolio, R | Portfolio, outside pools | Existing content; canonical update pending [OPEN] O11 | Public; embedded media and original-portfolio handoff | D21/D25/D26 settled; relationship to current Lovable and skin URLs [OPEN] O01, O11 |
| `/web/voice-playground/` — voice preview tool, U | Unclassified [OPEN] O05 | Homepage Live; unverified [OPEN] O16 | Public standard voice, restricted premium access declared | Preserve boundaries; placement/host [OPEN] O03, O05 |
| `/web/we-are-the-training-data/` — spoken-word draft, U | Optional context; default narrated poem role in intro/My Story | In development; source explicitly draft | Current unlisted/noindex; release readiness [OPEN] O12, O16 | Context DECIDED D04/D15; preserve route; approved recording/text [OPEN] O12 |
| `/web/womens-health-os/` — research intelligence, R | Health | Current “Live research”; evidence/status [OPEN] O06, O16 | Public research shell, external corpus/chat | Name/clinic model DECIDED D10/D16; fallback D28, details [OPEN] O03 |
| `/calendar/` and `/calendar/calendario.html` — copied-root HTML shims, U | Same unresolved placement as Calendar | Redirect role, inherits eventual project status | Public compatibility routes | Currently redirect to `/web/calendar/`; retain, future canonical [OPEN] O08 |
| `/movies/` — copied-root substantive Kids Movie catalog, R as href | Same unresolved placement as Kids Movie Library | Unverified [OPEN] O16 | Public catalog shell | Preserve; compare with `/web/kids-movie-library/`, select canonical and preserve state [OPEN] O08 |
| `/frontend/` — item-icon generator demo, U | Unclassified [OPEN] O05 | Unverified [OPEN] O16 | Public form shell; backend/provider dependency | Preserve; ownership, placement, hosted functionality [OPEN] O03, O05 |

### Copied non-page delivery families and potential API boundary

CURRENT: `build-vercel-static.cjs` copies the following assets/data families independently of the curated route registry. These rows account for delivery without publishing file contents or assuming that existing copy inclusion is an approved public-access policy. Lifecycle status belongs to the owning project rather than to an asset. **D17/D30** require separate ownership/access validation; final ownership, exposure, and canonical delivery are **[OPEN] O02, O02a, O10** where not established.

| Current delivery family / role | Desired pool or outside relationship | Lifecycle | Visibility/access | Canonical disposition and authority |
|---|---|---|---|---|
| `/public/**` — copied assets under the same directory name | Shared or project-owned assets; exact ownership [OPEN] O10 | Ancillary; owning-project lifecycle | Copied for static delivery; public suitability/access audit [OPEN] O02 | Retain during planning; register ownership/access per D30; final delivery [OPEN] O01, O10 |
| `/config/**` — copied configuration files; values intentionally not reproduced | Ownership and public-delivery necessity [OPEN] O02, O10 | Ancillary; no independent lifecycle | Current copy inclusion is not proof of public suitability; review each artifact [OPEN] O02 | Preserve during this documentation change; later allowlisting/protection/disposition [OPEN] O02; D17/D30 boundary |
| `/data/presets/**` — copied preset-data subtree | Consumer/owner mapping [OPEN] O05, O10 | Ancillary; owning-project lifecycle | Static-delivery inclusion observed; permitted public subset [OPEN] O02 | Retain compatibility while consumer paths are inventoried; final disposition [OPEN] O08, O10; D30 |
| `/resume.json` — copied root JSON document | Content/owner relationship, including any Portfolio use, [OPEN] O10, O11 | Ancillary; no independently assigned status | Contents not audited here; public suitability [OPEN] O02, O11 | Retain during planning; verify consumers and canonical-content ownership before changes; D25/D30 |
| `/data/sd_inventory_curated.json` — explicitly copied data file | Consumer/owner mapping [OPEN] O05, O10 | Ancillary; owning-project lifecycle | Static-delivery inclusion observed; access/provenance review [OPEN] O02, O16 | Preserve consumer compatibility; later delivery and data ownership [OPEN] O08, O10; D30 |
| `/web/**`, `/calendar/**`, `/movies/**`, `/frontend/**` — non-HTML files in copied trees | Assets/scripts/data supporting the page families above; exact per-file owner [OPEN] O10 | Inherit owning-project review | Copy inclusion observed; embedded/private-data suitability [OPEN] O02 | Existing asset paths remain planning inputs; validate references and aliases under D30, with final disposition [OPEN] O08, O10 |
| `/api/**` — potential file-based function family, distinct from static copy output | Service ownership and page consumers [OPEN] O02a, O10 | Service lifecycle/verification [OPEN] O02a, O16 | Public/restricted/internal enforcement and actual deployment inclusion unverified [OPEN] O02a | Source contains `api/board.js`, `api/fleet/status.js`, `api/graphify.js`, `api/library/[...path].js`, and `api/voice.js`; actual route discovery/runtime mapping [OPEN] O02a. D17/D30 require accounting without exposing configuration. |

The API source filenames establish a deployment-boundary question, not proof that those functions are deployed or publicly callable. Static copy rules alone cannot answer a host's file-based function-discovery behavior. The exact boundary must be verified under **[OPEN] O02a** before the registry is treated as complete.

### Nested pages and registry aliases

These rows are part of the deployment inventory even when they represent a redirect or a private section rather than a new project.

| Current route / role / coverage | Desired relationship | Lifecycle | Visibility/access | Canonical disposition and authority |
|---|---|---|---|---|
| `/web/ai-init/embed/` — embedded glossary, U | AI-d kit reference companion | Unverified [OPEN] O16 | Public embeddable shell | Preserve embed and imported glossary assets; independent embed contract [OPEN] O08, O09 |
| `/web/library/glossary/` — glossary child, A | AI-d kit search/glossary | Parent lifecycle review [OPEN] O16 | Public reference | Integration DECIDED D24; compatibility destination [OPEN] O08, O09 |
| `/web/library/platform/` — semantic platform docs, A | AI-d kit search | Parent lifecycle review [OPEN] O16 | Public reference shell; service verification needed | Integration DECIDED D24; URL/search behavior [OPEN] O08, O09 |
| `/web/library/repos/` — semantic repository search, A | Explore Repos integration; AI-d kit search relationship [OPEN] O09 | [OPEN] O16 | Current personal/password UI despite public-repo data claims | Separate public corpus from personal access [OPEN] O02, O09; route retained |
| `/web/library/general/` — personal memory, A | Internal data; public documentation boundary [OPEN] O02 | [OPEN] O16 | Personal/password UI | Preserve compatibility; resolve overlap with `/memory/` and authorized scope [OPEN] O02, O08 |
| `/web/library/memory/` — personal memory, A | Internal data; same unresolved overlap | [OPEN] O16 | Personal/password UI | Preserve; consolidation and access [OPEN] O02, O08 |
| `/web/library/chloe/` — Chloé memory, A | Chloé public documentation only, with documentation pool placement [OPEN] O05; internal memory separate | [OPEN] O16 | Personal/password UI; never a public memory corpus | D17 boundary; safe documentation/compatibility treatment [OPEN] O02, O08 |
| `/web/library/rag.html` — mixed-source semantic workspace, A | AI-d kit public search plus separate internal boundary | [OPEN] O16 | Public reference and personal-section UI mixed | D24 integration; resolve allowed sources and private access before reuse [OPEN] O02, O09 |
| `/web/council/byok/` — HTML redirect to free mode, U | Child compatibility of Councils; pool [OPEN] O05 | Redirect role, inherits parent | Public shim | Current target `/web/council/index.html#openrouter-free`; retain; future treatment [OPEN] O08 |
| `/web/council/inner/` — HTML redirect to free mode, U | Same Councils family | Redirect role, inherits parent | Public shim | Same free-mode target; retain and record former names as aliases [OPEN] O08 |
| `/web/council/tinylm/` — HTML redirect to tiny mode, U | Same Councils family | Redirect role, inherits parent | Public/noindex shim | Current target `/web/council/index.html#tinylm`; retain [OPEN] O08 |
| `/web/open-dashboard/github/` — ecosystem explorer, A | Child of Open Dashboard; pool [OPEN] O05 | Parent status review [OPEN] O16 | Public data shell | Preserve child or compatible destination; [OPEN] O08 |
| `/web/open-dashboard/mcp/` — agent setup/documentation, U | Child of Open Dashboard | Parent status review [OPEN] O16 | Public documentation | Register despite missing alias; preserve [OPEN] O10 |
| `/web/open-dashboard/openrouter/` — moved-explorer notice, A | Child compatibility of Open Dashboard | Redirect/notice role, inherits parent | Public noindex page | Current notice hands off to parent explorer; retain; canonical behavior [OPEN] O08 |
| `/web/open-dashboard/catalogues/` — moved-explorer notice, A | Same Open Dashboard family | Redirect/notice role, inherits parent | Public noindex page | Preserve current notice/handoff; future canonical [OPEN] O08 |
| `/web/open-dashboard/matrix/` — moved-connections notice, A | Same Open Dashboard family | Redirect/notice role, inherits parent | Public noindex page | Preserve current notice/handoff; future canonical [OPEN] O08 |
| `/web/manifesto-newborn/bg/` — Bulgarian, A | Optional GrowingApp/My Story context | Text/translation verification [OPEN] O12, O16 | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/de/` — German, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/es/` — Spanish, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/fr/` — French, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/it/` — Italian, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/mk/` — Macedonian, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/pt/` — Portuguese, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/ru/` — Russian, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |
| `/web/manifesto-newborn/zh/` — Simplified Chinese, A | Same Manifesto relationship | Same review | Public | Preserve locale, D08/D14 |

### Configured Vercel redirects and redirect-only families

These are observations of `vercel.json`, not edits requested by this plan. Each inherits the destination project’s eventual lifecycle and visibility; source existence alone does not make it featured. All remain compatibility inputs under [OPEN] O01, O08, O10. “Permanent” and “temporary” below are current config values, not newly chosen redirect policy.

| Current source(s) | Current destination / role | Target relationship and disposition |
|---|---|---|
| `/web/ai-init`, `/web/ai-init/` — permanent | `/web/library/glossary/`; R redirect family with a physical HTML shim that instead targets `/web/library/` | AI-d kit reference DECIDED D24; reconcile inconsistency [OPEN] O08 |
| `/web/llm-db/`, `/web/llm-db/:path*/`, `/web/llm-db/:path*` — permanent | `/web/library/`; R redirect family and physical parent shim | AI-d kit search DECIDED D24; wildcard compatibility review [OPEN] O08 |
| `/web/tinylm`, `/web/tinylm/` — permanent | `/web/council/index.html#tinylm`; R redirect-only family, no physical parent index | Councils pool [OPEN] O05; retain bookmark behavior [OPEN] O08 |
| `/web/open-overview`, `/web/open-overview/` — permanent | `/web/open-dashboard/` | Open Dashboard family; placement [OPEN] O05, compatibility [OPEN] O08 |
| `/web/open-overview/open-overview.js` — permanent | `/web/open-dashboard/open-dashboard.js` | Preserve asset alias; route registry must validate it [OPEN] O10 |
| `/web/open-overview/open-overview.css` — permanent | `/web/open-dashboard/open-dashboard.css` | Same asset-compatibility contract |
| `/web/open-overview/open-overview-api.js` — permanent | `/web/open-dashboard/open-dashboard-api.js` | Same asset-compatibility contract |
| `/web/open-overview/open-overview-charts.js` — permanent | `/web/open-dashboard/open-dashboard-charts.js` | Same asset-compatibility contract |
| `/web/open-overview/open-overview-schema.js` — permanent | `/web/open-dashboard/open-dashboard-schema.js` | Same asset-compatibility contract |
| `/web/open-overview/open-overview-three.js` — permanent | `/web/open-dashboard/open-dashboard-three.js` | Same asset-compatibility contract |
| `/web/open-overview/mcp/` — permanent | `/web/open-dashboard/mcp/` | Public documentation child; retain |
| `/web/open-overview/openrouter/` — permanent | `/web/open-dashboard/openrouter/` | Child notice/handoff; retain and verify complete chain |
| `/web/open-overview/github/` — permanent | `/web/open-dashboard/github/` | Public ecosystem child; retain |
| `/web/open-overview/catalogues/` — permanent | `/web/open-dashboard/catalogues/` | Child notice/handoff; retain and verify complete chain |
| `/web/open-overview/:path*/`, `/web/open-overview/:path*` — permanent | `/web/open-dashboard/:path*/`, `/web/open-dashboard/:path*` respectively | Includes compatibility for nested paths such as matrix; verify matched destination and assets [OPEN] O08, O10 |
| `/series`, `/series/` — temporary | `https://thedrop.sdforest.site/series` | The Drop standalone, AI-d kit headline DECIDED D24/D28; retain current public URL |
| `/series/dependency-map/`, `/series/dependency-map` — temporary | `https://thedrop.sdforest.site/series/dependency-map` | The Drop child; retain current public URL DECIDED D28 |

The non-slash LLM DB source behavior is covered by the current wildcard rule and must be tested explicitly alongside the explicit directory/index paths. Do not widen any redirect family merely to make the table simpler. Morning News is currently a handoff page, not a configured direct redirect; D24 is a future required change.

### External, excluded, and not-yet-mapped offerings

These catalog relationships are necessary even though they are not additional HTML route families copied by this build. Do not invent local routes for them.

| Offering | Placement / access / lifecycle | Canonical or delivery disposition |
|---|---|---|
| The Drop | Headline AI-d kit member; public standalone; Live badge currently, service verification [OPEN] O16 | DECIDED D24/D28; retain `https://thedrop.sdforest.site` and its current series links |
| FlowForm | Current external project; pool [OPEN] O05; homepage In development | Current public `https://flowform.sdforest.site` retained; host choice deferred D28/[OPEN] O03 |
| Dyslexia / Audiobook accessibility | Health DECIDED D16; public offering; Live badges currently, rigorous dyslexia evidence gate D07 | Shared-host fallback or independent hosting required D28; exact destination/fallback [OPEN] O03 |
| Gym Scholar | First Health project DECIDED D05/D10 | Verify whether current training route/content is the same product, a predecessor, or a distinct companion [OPEN] O05; do not silently rename it |
| Multiply Magic Studio | Current external In development offering; pool [OPEN] O05 | Preserve handoff pending catalog classification/hosting decisions; no fabricated route |
| Chloé desktop | Runtime internal and excluded from the public runtime offering; public documentation only DECIDED D17; documentation pool placement [OPEN] O05; status [OPEN] O16 | No separately copied page established; internal access design [OPEN] O02 |
| Portfolio at Lovable | Outside pools; public separate tab currently DECIDED D25 | Update baseline, then same-content skins with Ivan-selected default; hosting [OPEN] O03, content/variants [OPEN] O11 |
| repo-shelf | Secondary Explore Repos view DECIDED D19 | No new top-level route implied; encoding/search integration [OPEN] O09 |
| Open Design | Excluded from public offering; reference only in Library/Explore Repos DECIDED D22 | No local deployable page found in audited copied HTML; preserve reference provenance |
| Velune | Excluded DECIDED D22 | No public card or invented local route |
| AnyCloudLLM | Excluded from public surfaces until ready DECIDED D22 | Readiness verification before any future public inclusion [OPEN] O16 |

Legacy-plan mentions such as Prompt Builder/Publisher, A1111/ComfyUI helpers, shared family tasks, project dashboards, Python learning, and RuFlow are historical proposals. Their named page directories are not present in the audited copied HTML tree. They are not silently added to the seven-pool backlog or treated as deployed routes. Any revival, external ownership, or inclusion is [OPEN] O05. Backend APIs mentioned by README are service dependencies, not additional public project-page routes; file-based API deployment and route coverage remain [OPEN] O02a.

## 5. Project catalog and route-registry contract

### Conceptual data model

DECIDED D06/D30 require a single coherent factual model, with manual editorial choices layered on top. The representation may be authored files, a database, or a CMS; storage, migration, and editing workflow are **[OPEN] O04**. The table gives acceptance-level meaning derived from the cited decisions. Example field names, record layout, and review workflow are **[OPEN] O04/O10/O16**, rather than additional settled schema choices.

| Entity / conceptual fields | Required meaning and invariants | Authority / unresolved implementation |
|---|---|---|
| Project: `id`, public name, short explanation, owner, canonical-content reference | Stable identity survives renaming, host moves, and skin changes. One Fleet item owns Fleet/Board; one math catalog entry exposes distinct Math Forest/Math Mania experiences. Public names use D01/D10/D16. Ownership must be confirmed where unknown. | D01/D17/D20/D30; exact record form [OPEN] O04 |
| Relationships: primary pool, `pools[]` memberships, outside-pool role, parent/companion references, tags | Distinguish the primary route owner from one or more settled pool listings, references, research links, context, and companions. The council is the settled multi-pool case: primary route owner AI-d kit, listed in AI-d kit and TinkerBox. An unresolved membership is explicitly pending; do not auto-place by a keyword. Portfolio is outside pools. Internal documentation is not an exposed runtime. | D13/D15/D17–D24/D25/D30; unresolved membership [OPEN] O05 |
| Lifecycle: `status` | Exactly Live, Research, Experimental, or In development when assigned. Pending verification belongs in an editorial review field, not a fifth public status. Migration must review current labels instead of mapping every label by string similarity. | D06; assignment evidence [OPEN] O16 |
| Readiness: entry enabled, presentation mode, readiness evidence, blocker, reviewer | Models active versus frozen pool entrances and Coming Soon project treatment. A Live internal item can be unlisted. A physically deployed project can be unready. No empty Enter destination. | D05/D06; exact record/verification [OPEN] O04/O16 |
| Visibility and access: navigation visibility, search visibility, indexing intent, access class, allowed public surface | Separate listed/unlisted/excluded selection from public/restricted/internal authorization. Include a public-documentation-only surface where required. Public search and generated metadata must never include internal corpus content by accident. Noindex is not authorization. Exact enforceable access design is [OPEN] O02. | D17/D22/D30; enforcement [OPEN] O02/O02a |
| Manual curation: featured selection, order, editorial rationale, curator, review state | Homepage and per-pool featured choices stay manual, with no fixed count. Finish/polish governs order, with Gym Scholar first in Health. Unfeatured eligible entries remain reachable through overflow/library browsing. Registry discovery cannot automatically promote a card. | D05/D30; selections [OPEN] O17 |
| Updates: `lastMeaningfullyUpdated`, update note, provenance | Every card has a meaningful-update date, traceable to an actual content, functional, evidence, or design change. File-copy/build time and automated refresh noise do not count. Never invent missing dates; audit them before exposing cards [OPEN] O16. | D06; provenance workflow [OPEN] O04/O16 |
| Metrics: name, value, unit, scope, source, measured-at, method, freshness/uncertainty | Counts, stars, forks, papers, model coverage, usage, and experiment measurements are metrics. State what was measured and when. Separate platform-wide activity from project-specific usage. Do not use a metric as a lifecycle badge or claim that stale snapshots are live. | D06; metric definitions/freshness [OPEN] O09/O16 |
| Evidence and claims: claim text/ID, type, sources, evidence grade, method, caveats, reviewer, review date, reproduction reference | Trace consequential statements to ingested evidence; distinguish observation, hypothesis, estimate, derived finding, and demonstration. Research status alone is not validation. Preserve attribution/rights for creative and third-party work. | D07/D11/D23; methods/review model [OPEN] O06/O07/O14 |
| Delivery/link: public canonical destination, route family, host owner, open mode, warning requirement, dependency/fallback record | Record in-place, separate-tab, or external-app behavior without embedding private configuration. Apply the warning only at D28’s boundary. A fallback describes the public behavior on service failure and who maintains it. Host/provider choices remain open. | D17/D24/D28/D30; hosts/URLs [OPEN] O01/O02a/O03/O08 |
| Presentation: pool/card still, active preview, entrance treatment, accessibility alternatives, skin/content relationship | Required motion and still states are explicit. Portfolio visual skins share canonical content; audience variants may select different content. Default portfolio skin is unset until Ivan chooses. | D02–D05/D08–D15/D25/D26; exact design [OPEN] O11/O12/O13/O14/O15 |

### Registry shape and responsibilities

**DECIDED D17/D30:** The route registry validates deployment ownership and separate visibility/access; it does not generate homepage curation. The following semantic contract implements those decisions. Exact field names, data representation, route-discovery mechanism, and validation tooling remain **[OPEN] O04/O10**. File-based API inclusion must first be verified under **[OPEN] O02a**.

| Route field group | Contract | Authority / unresolved implementation |
|---|---|---|
| Identity and ownership | Stable route ID, exact source path/pattern, owning project ID, parent route, and kind: page, child, embed, HTML shim, host redirect, or asset alias. These are routing kinds, not lifecycle statuses. | D30; exact fields and routing kinds [OPEN] O04/O10 |
| Delivery evidence | Source file or configured redirect rule, build inclusion reason, current destination, canonical-intent state, and associated public assets. Discover physical routes from the actual copy boundary as well as explicit redirects. | D30; discovery/boundary [OPEN] O02a/O10 |
| Compatibility | Directory/index aliases, exact non-slash variants, locale, hashes/queries where relevant, redirect permanence, destination resolution, and migration reason. Detect loops, missing targets, route collisions, and unwanted wildcard capture. | D30 and route-retention scope; exact treatment [OPEN] O01/O08 |
| Visibility/access | Explicit navigation/search/indexing fields and authorization/public-surface fields, independent of registry inclusion and prefetch/prerender. Internal routes are validated but not advertised. | D17/D22/D30; enforcement [OPEN] O02/O02a |
| Delivery controls | Explicit prefetch/prerender behavior based on cost and access. Preserve or revise current controls only with evidence; never prefetch a private action or execute costly embedded work because it is registered. | D17/D30; whether/how to retain prefetch/prerender [OPEN] O10 |
| Validation state | Last verification, method/result, owner, unresolved decision references, and acceptance evidence. Unresolved canonical placement cannot masquerade as final. | D06/D30; tooling and record shape [OPEN] O04/O10 |

CURRENT: `id`, `href`, `state`, `parent`, `placement`, `prefetch`, `prerender`, `aliasPaths`, labels, trail IDs, and connection IDs are migration inputs. Existing `state` mixes presentation and route roles. **D06/D30** require separate lifecycle/access semantics; the exact replacement fields and treatment of historical trail relationships remain **[OPEN] O04/O10/O15** without becoming a second navigation authority.

Validation acceptance derived from **DECIDED D06/D17/D22/D30** follows. Exact tooling, assertions, and deployment boundaries remain **[OPEN] O02a/O10**:

1. **D30:** Discover root and copied page/asset/data families plus configured redirects and verified API families; compare against the registry. Every deployable route has one explicit owner, including unlisted pages, child pages, translated pages, and redirect-only families. API inclusion is **[OPEN] O02a** until verified.
2. **D01/D06/D17/D30:** Validate project references, names, lifecycle values, update provenance, metric units/sources, and separate visibility/access fields. Check that a canonical destination exists or is a verified external handoff; exact destinations remain **[OPEN] O01/O08**.
3. **D30 and the approved no-route-deletion scope:** Check current and proposed compatibility paths before migration: slash/index variants, embed assets, hashes, query state, translated pages, copied-root pages, asset/data families, and redirect chains. Treatment remains **[OPEN] O08**.
4. **D17/D22/D30:** Validate curation against eligible project records without deriving curation from the inventory. Internal/excluded records cannot become public cards through automatic enumeration.
5. **D05/D06/D07:** Connect Live/readiness to section 6 acceptance evidence. Report failing or unknown facts instead of inventing success; unresolved assignments remain **[OPEN] O16**.

## 6. Shared experience, accessibility, and evidence

### Reusable experience contracts

**Implementation guidance for DECIDED D02/D03/D06/D08–D15/D25–D30:** Reuse consistent shell navigation/back behavior, pool windows, project cards, explicit Enter, status/update/metric treatment, plain-language introductions, featured/overflow controls, search and result explanations, evidence/source panels, service/fallback messages, external-opening warning, Portfolio control/skin switcher, and secondary donation control. Preserve each pool’s settled visual language. Exact component boundaries and implementation are **[OPEN] O04/O10/O15**, not a selected architecture.

**DECIDED D03/D05/D06:** The card flow is preview → selection → explicit entry. Desktop hover enriches a preview but is never the only way to discover content. First click selects; Enter opens. On mobile, first tap selects, then tapping Enter opens. Keyboard focus must offer preview/selection and an accessible Enter action. Disabled pools have meaningful names and readiness text, strong stills, and no misleading active links. Coming Soon projects are greyed/tilted while their names and explanation remain readable. Display status, separate metrics, and last meaningful update on every project card, including unfinished entries. Exact widgets and focus/selection implementation remain **[OPEN] O15** within these requirements.

**DECIDED D02/D04/D06/D25:** The homepage layout remains stable as animation starts, stops, or loads. The scroll-to-skip handoff preserves the exact seed/tree progress already reached. A reduced-motion path provides equivalent meaning and navigation without forced camera travel. Narration has accessible text and controls; browser audio restrictions need a usable accessible starting path. The default narrated poem does not make listening compulsory. Portfolio appears after the intro boundary and stays usable without blocking content. A shared progress state is one implementation option, not a requirement; synchronization design, narration controls, and audio-constrained behavior remain **[OPEN] O12/O15** while preserving these outcomes.

**Verification criteria for DECIDED D03/D06/D28/D29:** Mobile acceptance includes readable explanations and evidence, touch-accessible controls, predictable back navigation, selection that is distinct from scrolling, useful loading/service-failure states, and frames that do not trap the viewport. Search, filters, calculators, and evidence panels must remain useful without hover. Check keyboard operation, visible focus, control names, headings, contrast, target sizes, zoom/reflow, and screen-reader sequence. Continuous motion needs reduced-motion alternatives and appropriate pause behavior; decorative animation must not make text or control position unstable. Exact test coverage, pause controls, and any offline capability are **[OPEN] O03/O10/O15**; offline operation is not an implicit product commitment.

**DECIDED D25/D26/D28:** Warn at the moment an action will open a separate tab or external application. Do not warn on every internal navigation, ordinary in-place link, or portfolio skin switch. The current Lovable Portfolio separate-tab handoff uses this boundary; future in-place portfolio skins retain reading position and navigation state. The warning’s exact form, wording, and controls, including a possible cancel/continue interaction, remain **[OPEN] O15**.

**DECIDED D17/D28/D29:** Above each public tool, explain what it does and what its output means. Include the core starting action, required input, external processing where relevant, and material limits in plain language. For service-backed work, show what remains usable if the dependency fails. A link to the same failed host is not an independent fallback. Do not expose private endpoints or setup secrets in these explanations. Project-specific fallback and explanation content remain **[OPEN] O03/O06** until verified.

### Live and consequential-claim acceptance bar

**DECIDED D06/D07/D23:** The four-value lifecycle model describes the product’s maturity or research role; evidence validity is an independent requirement. Research and Experimental labels never excuse unsupported claims. The gates below are acceptance elaborations of their cited decisions, not new lifecycle choices. A Live label is earned by the relevant release evidence, not inherited from current markup. Exact protocols and reviewers remain **[OPEN] O06/O07/O10/O16**.

| Gate | Evidence required before done/Live | Authority / unresolved verification |
|---|---|---|
| Functional | End-to-end core workflow works in the intended public environment, including empty, loading, invalid-input, failure, and recovery paths. Required service/auth/persistence boundaries are tested. An attractive shell is insufficient. | D06; project-specific workflow/service tests [OPEN] O03/O10/O16 |
| Explanation | The above-tool introduction matches actual behavior and makes inputs, outputs, limits, and external processing understandable. A visitor can start without repository knowledge. | D06/D29; project-specific content [OPEN] O06/O16 |
| Accessibility/mobile | Core workflow tested with keyboard, relevant assistive technology, narrow screens, touch, reduced motion, and zoom. Intro skip and Enter work without hover or audio. | D03/D04/D06; exact test scope/controls [OPEN] O10/O12/O15 |
| Polish/readiness | No broken destinations, misleading status, placeholder-as-functional behavior, illegible still states, missing meaningful-update dates, or unexplained service dependencies. Featured selection reflects finish/polish. | D05/D06/D30; readiness/curation evidence [OPEN] O16/O17 |
| Claims and provenance | Every consequential claim has an inspectable evidence trail. Ingest peer-reviewed sources with stable identifiers, source dates, extraction/provenance, methods, populations, limitations, and review. Link the specific public statement or calculator assumption to that evidence. Record conflicting and absent evidence instead of hiding it. | D07; evidence protocols/review [OPEN] O06 |
| Reproduction and review | Derived findings can be reproduced from available, appropriately publishable inputs and documented methods. Identify review responsibility; verify the calculation or synthesis matches the source. Keep raw observation distinct from interpretation. | D07/D23; reproduction and reviewer details [OPEN] O06/O07 |
| Availability and access | Public functionality survives loss of a shared companion host through a useful fallback or independent delivery. Public documentation for Chloé/Fleet reveals no private operational data or active controls. Public queries cannot cross into private corpora. | D17/D28; service/access implementation [OPEN] O02/O02a/O03 |

**DECIDED D07/D23, with claim-specific scope [OPEN] O06/O07:** Apply the evidence bar to Health, learning/development, and science claims. Lobester Gym’s coordination and developmental explanations and the dyslexia platform’s accessibility/development claims need source ingestion and claim review before done. Women’s Health OS and training research need claim/source inspection, not only paper counts. Life in Time assumptions and Power Law Odyssey’s explanatory claims need qualification and provenance. C2C psychometrics, rates, archetypes, and convergence claims require rederivation before republication as findings. A movie catalog should substantiate film metadata, language availability, and any age/development assertions without pretending ordinary browsing is a clinical intervention.

Research protocol, reviewers, evidence grades, retention, and public reproducibility limits are [OPEN] O06, O07. Do not turn this documentation pass into medical or scientific advice, or invent evidence that has not been ingested and reviewed.

## 7. Build order, reasoning, and acceptance gates

**Execution sequence for DECIDED D01–D30:** The approved task requires the dependency order below. Each gate cites the decisions it verifies; this sequencing does not create new product choices. It expresses dependencies, not dates or estimates, and chooses no framework, renderer, database, CMS, new host, fixed project count, or default portfolio skin. Any implementation option beyond those decisions remains **[OPEN]** under the cited question before dependent work begins.

| Order | Work and reasoning | Exit/acceptance gate | Authority / unresolved choices |
|---|---|---|---|
| 1. Inventory, catalog, route validation | Resolve ownership, private/public boundaries, costly architecture questions, and catalog storage before visual work can hard-code wrong identities or URLs. Use section 4 to reconcile copied files, registry aliases, redirects, project records, and current labels. | Every route has an owner and visibility/access fields; unclassified pages remain explicit; duplicate movie/Fleet/math relationships recorded; data model chosen under O04; registry-validation strategy accepted under O10; no public leak or automatic homepage promotion. | D06/D17/D20/D30; [OPEN] O01/O02/O02a/O04/O05/O10 |
| 2. Shared shell and route compatibility | Build navigation/back behavior, card semantics, above-tool introduction, warnings, access-aware delivery, and compatibility handling before migrating content. Resolve O01/O02/O03/O08 as each slice requires. | Directory/index/legacy/locale/embed/redirect paths continue to resolve; no route deletion or redirect loop; protected boundaries remain protected; core shell works with keyboard, touch, reduced motion, and no audio. | D03/D06/D17/D28/D29/D30; [OPEN] O01/O02/O02a/O03/O08/O10 |
| 3. Front page and intro | Implement the stable forest UI and seven pool windows on the validated catalog/route foundation. Prototype exact tree-progress continuity before producing final narration/animation assets. | All seven names exact; two-step Enter verified on desktop/mobile/keyboard; no tutorial/double-click; all pools visible with correct active/frozen states; narrated word poem optional with explicit scroll-to-skip and exact-progress handoff; Portfolio appears only after intro. | D01–D06/D25; [OPEN] O12/O15/O16 |
| 4. Pool pages | Use settled entrance/interior contracts and confirmed catalog membership. Verify prior Design Gallery work, resolve Health biology subject, and conduct the deferred My Story/root visual pass. | GrowingApp optional Manifesto and calm evidence-led interior; AI-d kit search-first with separate guided mode; Health project-first clinic; My Story narrative-first unfinished arc; museum provenance intact; each entrance has accessible still/motion alternatives. No invented members for TinkerBox or other unresolved placements. | D08–D15; [OPEN] O05/O13/O14/O15 |
| 5. Project migrations and consolidation | Move factual/project presentation into the shared contracts without conflating content and routing. Consolidate Library search and Explore Repos; unify Fleet identity and the math entry; migrate Portfolio canonical content before skins. | Distinct Math experiences preserved; Mendeleev Live behavior verified; Library old URLs compatible; Morning News direct handoff implemented only in its later authorized slice; C2C archive maintained; internal tools documentation only; exclusions respected; state/content comparison completed before movie canonical migration. | D16–D26/D29; [OPEN] O02/O05/O08/O09/O11 |
| 6. Evidence completion and readiness | Evidence intake starts during inventory and continues during project work; final claim review closes here before any consequential project earns done/Live. Rederive C2C, verify sources/metrics, and exercise remote failure paths. | All Live gates in section 6 pass for each promoted project; claims trace to reviewed evidence; metrics have provenance and dates; public fallback works; unknowns stay explicitly Research/Experimental/In development as reviewed rather than being promoted automatically. | D06/D07/D23/D28; [OPEN] O03/O06/O07/O16 |
| 7. Final quality and editorial pass | With functioning routes and content, verify the complete experience, motion budget, accessibility, search, curation, and archive discoverability. Ivan reviews portfolio iterations and selects the default. | Complete route/alias matrix checked against delivery; all planned requirements traced; no accidental public internal items; manual featured choices accepted with no forced count; canonical content and skin/audience distinctions correct; current status and update dates honest. Release/hosting approval is a separate future action. | D01–D30; [OPEN] O10/O11/O16/O17/O18 |

**D07/D23 acceptance dependency:** Evidence is an input dependency: if a claim affects a project’s design, source/review work begins before that project’s interaction is finalized. **D30 validation dependency:** Route/storage choices remain **[OPEN] O01/O04/O08** until explicitly resolved before dependent implementation.

## 8. Ranked [OPEN] questions

Ranked highest cost-to-reverse first. Owner means the person who settles the product choice; verification may be performed by the implementer. Where an evidence reviewer or maintainer is not yet identified, appoint one explicitly. No open item reverses a DECIDED requirement.

### [OPEN] O01 URL architecture and route ownership boundaries

- **Question:** What canonical URL architecture will the rebuild use, and which products own independent release/content boundaries?
- **Options:** Preserve `/web/*` and copied-root compatibility with new pool pages; move canonical public pages to a consistent same-origin structure while retaining shims; use selective subdomains for independent products; a documented hybrid.
- **Why open:** The legacy plan prescribes subdomains, current source is mostly copied static routes, and existing external products have retained handoffs. No final URL scheme or technology has been selected.
- **Owner/action:** Ivan and the implementation owner compare navigation, shared shell, origin/API needs, ownership, and compatibility before selecting.
- **Later-change cost:** High: bookmarks, search indexing, content links, embeds, auth boundaries, routing tests, and cross-project navigation all need migration.

### [OPEN] O02 Public documentation, private data, and enforced access

- **Question:** How will documentation-only Chloé/Fleet surfaces and mixed Library/ingest pages be delivered without exposing internal controls or data?
- **Options:** Public documentation with separately protected runtime; authenticated same-site internal routes outside public indexes; private runtime elsewhere with documentation-only public compatibility pages. Public reference corpora must remain separate from personal sources in all options.
- **Why open:** Current copied pages include internal shells and personal-section/password UIs. Noindex or hidden navigation does not demonstrate enforceable authorization. D17 settles the public boundary, not its implementation.
- **Owner/action:** Implementation owner audits build inclusion and server-side enforcement without recording private configuration publicly; Ivan confirms ownership of ambiguous personal/library sources.
- **Later-change cost:** High: accidental exposure, index cleanup, access migrations, and rewritten search/data contracts are costly to repair.

### [OPEN] O02a File-based API route and deployment boundary

- **Question:** Which source API families are actually deployed by the host independently of the static copy build, and what ownership, access, and compatibility contract belongs to each?
- **Options:** Register confirmed file-based function routes separately from static pages; register an independently deployed backend/proxy boundary with explicit consumers; document source-only or non-deployed functions as excluded from the deployed inventory after verification. No option is selected by file presence alone.
- **Why open:** API source files exist for Board, Fleet status, Graphify, Library catch-all handling, and Voice. The static copy script does not copy `api/`, and the inspected routing configuration does not by itself establish function discovery, deployment output, or authorization. Omitting service routes from all-route validation would leave a material boundary unresolved.
- **Owner/action:** Deployment/implementation owner verifies host discovery and deployment output with read-only evidence, inventories exact API families and consumers, and checks authorization without exposing configuration values or internal destinations. Ivan resolves any materially changed public-service offering.
- **Later-change cost:** High: a mistaken boundary can expose internal functions, break public tools, misstate route coverage, or require host/access and client-contract migrations. This question ranks after O02 and before O03 because the deployment boundary informs hosting choices.

### [OPEN] O03 Hosting, service dependencies, fallback, and persistence availability

- **Question:** Which public tools keep their present hosts, which need independent delivery, and what fallback provides useful behavior when a dependency fails?
- **Options:** Retain companion hosting with an independent static/read-only fallback; migrate selected public tools to independently operated hosting; use a shared public backend with tested independent fallback where justified. Compare iframe, in-place native UI, and external handoff case by case.
- **Why open:** The current build is static; multiple tools use external services/frames. D28 requires fallback or independence for the shared Chloé host and retains The Drop/FlowForm URLs. Lovable project hosting and provider choices remain deferred.
- **Owner/action:** Runtime owners map each dependency, public-data needs, failure behavior, and maintenance cost; Ivan selects proposed hosting changes in a later implementation scope.
- **Later-change cost:** High: deployment, data/state migration, auth, embedding policies, links, operating cost, and support burden.

### [OPEN] O04 Catalog storage and editing workflow

- **Question:** Where will the section 5 model live and who edits, reviews, and publishes it?
- **Options:** Versioned structured files with review; a database with an editing interface; a CMS with structured records; a documented hybrid separating facts from curated presentation.
- **Why open:** Current metadata is distributed across HTML, route records, and pages. No shared catalog contract or chosen persistence system exists in the inspected sources.
- **Owner/action:** Implementation owner compares schema evolution, public/private separation, ease of Ivan’s manual curation, validation, migration, and operating cost; Ivan confirms workflow.
- **Later-change cost:** High: content migration, stable IDs, editing habits, permissions, build integration, and history/provenance must be carried over.

### [OPEN] O05 Unclassified projects, ambiguous identities, and remaining ownership

- **Question:** Which pool, outside-pool relationship, and owner apply to still-unclassified pages and external offerings?
- **Options:** Explicit assignment to an existing canonical pool; companion/reference entry under an existing project; site-level or internal documentation; intentional unlisted/archive status. Do not create an eighth pool by default.
- **Why open:** Current old groups/trails are not target authority. Open mappings include Explore Repos, Avatar Playground, Voice Playground, Rubik’s Teacher/Cubeflow, Calendar, Kids Corner, Kids Movie Library, Poetry Space, Open Dashboard, the icon generator, FlowForm, Multiply Magic Studio, and the public documentation for Chloé PWA and Chloé desktop. Chloé’s non-public runtime boundary does not decide its public documentation’s pool placement. Verify Gym Scholar versus the current Hyper Trophy OS route; settled Gym Scholar ordering does not prove they are identical. No copied routes establish the legacy-plan-only product proposals. The council’s shared AI-d kit/TinkerBox membership is settled by D13; only its route-compatibility treatment remains open under O08.
- **Owner/action:** Ivan settles remaining product membership/identity; implementer supplies concise scope and current-route evidence. The council's TinkerBox membership is already settled by D13; other unresolved candidates must not be assigned by inference.
- **Later-change cost:** High to medium: changes project identities, navigation, research framing, content ownership, links, and catalog migrations.

### [OPEN] O06 Evidence protocol, reviewer ownership, and claim scope

- **Question:** Which claims will each consequential project make, and what reviewed evidence/protocol is sufficient for those precise claims?
- **Options:** Narrow scope to well-supported educational descriptions; ingest and review a broader research corpus for stronger claims; keep unsupported capabilities explicitly under research/development with clear limits. Identify suitable reviewers rather than treating automation as final review.
- **Why open:** D07 settles peer-reviewed ingestion before done. Current pages make developmental, health, cognitive, scientific, and estimate-based claims, but inspected HTML cannot establish their validity. Existing “research” and paper-count displays are not sufficient evidence.
- **Owner/action:** Ivan defines intended scope with the project owner; appoint relevant evidence reviewers. Audit Lobester Gym, dyslexia, Women’s Health OS, training tools, Life in Time, Power Law Odyssey, and claim-bearing learning/movie content.
- **Later-change cost:** High to medium: unsupported claims can force content, calculations, data pipelines, positioning, and user expectations to be rebuilt.

### [OPEN] O07 C2C rederivation and public archive presentation

- **Question:** Can the published C2C measurements and interpretations be reproduced, and which survive review?
- **Options:** Recompute from preserved publishable transcripts with documented methods and publish corrected findings; retain transcripts as archive with withdrawn/unverified analyses identified; publish a new reproducible study linked to the archive.
- **Why open:** D23 requires rederivation; current pages state attractor rates, psychometric values, archetypes, and convergence interpretations. Their correctness is not established by the pages.
- **Owner/action:** Research implementer retrieves appropriate source artifacts, reproduces metrics, identifies methods/limitations, and obtains review before findings are promoted. Ivan approves editorial treatment of the archive.
- **Later-change cost:** Medium to high: public research credibility, comparisons, visualizations, evidence links, and conclusions may all change. Artificial Self placement and public archive intent are already settled.

### [OPEN] O08 Canonical implementations and legacy-route treatment

- **Question:** What exact compatible destination or behavior will each duplicate, renamed, retired, or child route retain?
- **Options:** Keep separate experiences under one project; use equivalent subviews with stable aliases; keep archive/read-only pages; redirect exact routes after state/content comparison. Knowledge Ingest specifically retires its functionality or redirects to an appropriate authorized destination without deleting the old route.
- **Why open:** AI Init’s HTML/config/test disagree; Library/LLM DB and Council shims overlap; movie routes are substantive duplicates; Calendar has root shims; Open Dashboard has child notices, older asset aliases, and wildcard redirects; personal memory children overlap; Fleet has two views; README claims are stale.
- **Owner/action:** Implementation owner records exact slash/index/query/hash/locale behavior and user-state implications before proposing each migration; Ivan resolves materially different product outcomes.
- **Later-change cost:** Medium to high: redirect chains, lost state, broken embeds/bookmarks, duplicated maintenance, indexing, and incompatible public APIs for embedded references.

### [OPEN] O09 Unified search and Explore Repos integration details

- **Question:** Which public sources and tools are indexed by AI-d kit, and how do repository search, code search, graph data, and the secondary repo-shelf work together?
- **Options:** One public search with clear source-type filters and scoped subviews; a public federated search with explicit source boundaries; separate indexed engines behind a consistent results contract. For the shelf, compare linear/log/bounded star/fork width scales with a legible labeled/list alternative; determine whether stars and forks use a selectable or documented combined measure.
- **Why open:** Search-first and guided mode are settled, as are integration under Explore Repos and shelf styling. Current indices differ in authored/forked/parsed scope, stale counts, and personal/public wording. The precise query model, metrics encoding, and corpus ownership are not settled.
- **Owner/action:** Search implementer audits sources, permissions, completeness, freshness, and result explanations; Ivan reviews the browsing model.
- **Later-change cost:** Medium: indexing, URLs/query state, result ranking, access handling, shelf encoding, and user expectations.

### [OPEN] O10 Complete route validation and general quality gate

- **Question:** How will physical delivery, aliases, registry ownership, catalog facts, manual curation, and project acceptance be checked together?
- **Options:** Build-discovery contract tests plus targeted runtime checks; a manifest of expected delivery compared with discovered files/config; a hybrid with content-schema and browser checks. Reuse existing specialized workflows where useful. Compare retaining current prefetch/prerender settings with revised access/cost-aware controls; no new delivery-control policy is selected here.
- **Why open:** The copy build and curated registry disagree, the baseline route contract has five failures, current tests encode outdated assumptions, and there is no inspected general test/CI gate. Current trail/state fields mix roles.
- **Owner/action:** Implementation owner proposes and verifies the general gate, separates fixture drift from real product defects, and records how validation covers unlisted/internal pages without exposing them.
- **Later-change cost:** Medium: changing discovery/schema conventions late can invalidate many tests and allow route or visibility regressions during migration.

### [OPEN] O11 Updated portfolio baseline, audience variants, and default skin

- **Question:** What content is current and canonical, what belongs in the CG/VFX versus coding/AI variants, and which completed visual skin does Ivan choose as default?
- **Options:** Audit/update the existing baseline, then create shared-content skins; use selective links for distinct audiences with explicitly scoped content; retain appropriate old links as compatibility entries. The default remains unchosen until the iterations exist.
- **Why open:** D25–D26 settle the control, current Lovable separate tab, in-place skin behavior, and Ivan’s choice. Existing portfolio claims and chronology have not been confirmed as current.
- **Owner/action:** Ivan supplies/verifies content and selects the default after reviewing working iterations; implementer verifies state/position preservation and media destinations.
- **Later-change cost:** Medium: reauthoring content across skins, audience confusion, duplicate canonicals, broken case-study links, and position/navigation regressions.

### [OPEN] O12 Narration production, approved text, and locale handling

- **Question:** Which approved word-poem text/recording and optional context assets ship, and how are narration, transcript, translated Manifesto content, and progress continuity produced accessibly?
- **Options:** Approved human narration; approved generated narration; text-equivalent launch with an explicit audio-start control where playback is constrained. Compare one shared progress model with alternate non-motion presentation; retain all existing translated routes.
- **Why open:** The narrated word poem default and optional skip are settled. The copied poem is a draft; source text alone does not supply an approved recording or prove a working exact-progress handoff. Translation files exist but have not been editorially reviewed.
- **Owner/action:** Ivan approves text and creative assets; implementation owner prototypes the seamless handoff and audio/reduced-motion states; qualified readers verify locale content as needed.
- **Later-change cost:** Medium: changing approved text or timing after final animation/narration requires recutting assets, synchronization, transcripts, and translations.

### [OPEN] O13 Health living-anatomy subject

- **Question:** Which biological subject should animate the Health entrance?
- **Options:** Whole-body anatomy; a carefully scoped organ/system; tissue/cellular processes; an abstract but scientifically faithful living-system study.
- **Why open:** Living anatomy and the precise project-first clinic are settled; the subject is explicitly deferred. The subject must not imply clinical scope that the projects/evidence do not support.
- **Owner/action:** Ivan selects in the design pass after relevant visual studies and scientific review.
- **Later-change cost:** Medium: anatomy assets, animation, evidence framing, accessibility descriptions, and entrance composition may need replacement.

### [OPEN] O14 Verify the earlier Design Gallery entrance and preserve provenance

- **Question:** Where is the earlier museum-gallery entrance implementation, what is usable, and how does the current Found Work shelf relate to the owned-work exhibits?
- **Options after verification:** Reuse the verified entrance; adapt a partial implementation to the settled museum reveal; rebuild the same settled direction if no usable implementation is found. Retain Found Work as a clearly credited reference exhibit/subview if appropriate, with an explicit canonical relationship.
- **Why open:** The inspected `/web/gallery/` is third-party Found Work, while the homepage also describes a disabled different gallery concept. This is an implementation/provenance verification question, not a re-ask of museum direction.
- **Owner/action:** Implementer locates and inspects prior source/design artifacts through authorized repository/history sources, compares with D11, and reports evidence. Escalate only a new material product choice that the evidence cannot resolve.
- **Later-change cost:** Medium to low: rebuilding an existing usable entrance wastes production; mixing third-party and owned work can require redoing attribution, exhibit organization, and content links.

### [OPEN] O15 Deferred visual detail and remaining pool page composition

- **Question:** What exact root interaction, My Story visual language, detailed entrance/page compositions, and shared interaction controls implement the settled intent?
- **Options:** Visual studies within the stable UI-first shell; narrative/ambient roots with optional context reveals; variants for the unfinished My Story timeline, quiet TinkerBox utilities, and scientifically grounded Artificial Self laboratory. Compare accessible inline versus dialog external-opening warnings, explicit pause controls versus automatically reduced decorative motion, and card focus/selection patterns that preserve D03’s two-step Enter. Component boundaries remain an implementation choice. Pools remain navigation in every option.
- **Why open:** D12–D15 deliberately defer these details. Current Forest Trails and root visuals are evidence, not a chosen default. My Story’s short narrative-led content is already settled.
- **Owner/action:** Design implementer produces comparable studies; Ivan selects material visual directions during the design pass.
- **Later-change cost:** Lower than URL/data changes but still affects assets, layout, motion, focus behavior, and shared components.

### [OPEN] O16 Honest lifecycle, readiness, meaningful updates, and metrics

- **Question:** What verified status, readiness evidence, update date, and metric provenance belongs to each current project/card?
- **Options:** Audit each project’s flow and history; record supported lifecycle and update facts; keep unfinished work below featured entries with truthful readiness; omit unsupported metrics until sourced. Do not invent dates or assign Live from a copied badge.
- **Why open:** Current mixed labels, stale counts, disabled/live conflicts, external dependencies, and incomplete evidence make automatic migration unreliable. D06’s vocabulary, Fleet’s Live internal state, and Mendeleev’s Live target are already settled.
- **Owner/action:** Project owners/implementer verify core flows and claim evidence; Ivan confirms manual finish/polish ranking and ambiguous update significance.
- **Later-change cost:** Lower schema cost once O04 is settled, but inaccurate public claims can create substantial trust and editorial repair work.

### [OPEN] O17 Manual featured selection and overflow interaction

- **Question:** Which ready entries are featured at a given moment, and how does overflow/library browsing remain useful in each pool?
- **Options:** Editorial selection with responsive layout; different presentation density by pool; accessible search/filter/list overflow where appropriate. There is no fixed featured count and none should be invented as a default.
- **Why open:** D05/D30 settle finish/polish ordering, Gym Scholar’s Health lead, manual homepage curation, and featured-plus-overflow. Exact selections and layout depend on confirmed membership/readiness.
- **Owner/action:** Ivan curates with implementation support and verified project records; assess real narrow-screen and keyboard behavior.
- **Later-change cost:** Low: mostly editorial/layout work once catalog and navigation contracts are stable.

### [OPEN] O18 Donation implementation and secondary control details

- **Question:** Which voluntary support provider/destination and compact lower-corner treatment fit the completed shell?
- **Options:** Buy-Me-a-Coffee-style external handoff; an equivalent voluntary support destination; a secondary support panel linking to an approved provider.
- **Why open:** The voluntary, visible-but-secondary site-level role is settled; provider and final control treatment are not.
- **Owner/action:** Ivan selects the destination; implementer verifies accessibility, the external-opening boundary, and lack of overlap with mobile navigation.
- **Later-change cost:** Low: control styling and destination changes, provided no unnecessary payment-specific architecture is introduced.

## 9. Acceptance checklist and non-goals

### This master-plan change

**DECIDED documentation scope:** These checks implement the approved task’s archive, coverage, verification, and documentation-only requirements. They authorize no rebuild or deployment work.

- [ ] `SDFOREST-MASTER-PLAN.md` exists at repository root and covers purpose/authority, all DECIDED requirements, source gaps, complete route families, data model, registry contract, shared experience/evidence, build order, ranked open questions, and acceptance.
- [ ] `docs/archive/sd-forest-master-plan.md` exists, with this exact first line: `> Superseded by SDFOREST-MASTER-PLAN.md on 2026-09-15.` The remainder is the original legacy plan, apart from the inserted separating blank line.
- [ ] The tracked root `sd-forest-master-plan.md` is absent because it was moved with `git mv`; archive continuity is visible in the diff.
- [ ] The only resulting tracked document paths are the new master plan and archive. The original root path appears only as the rename source. No application, hosting, routing, deployment, generated-output, or unrelated tracked file changes.
- [ ] All seven exact pool names, all four context names, the word poem default/optional rule, narrative-first My Story, one internal Fleet identity, placement exclusions, and ranked `[OPEN]` items pass a focused document check.
- [ ] Every copied HTML family, non-page asset/config/data family, registry href/alias, and configured redirect source is represented in section 4, with explicit directory/index coverage. Potential file-based API delivery is explicitly [OPEN] O02a. Unregistered pages and unclassified membership remain visible in the plan.
- [ ] `git diff --check` passes immediately before commit. Inspect the full changed-file list and archive diff, not just a summary.
- [ ] After staging, `git ls-files --error-unmatch SDFOREST-MASTER-PLAN.md docs/archive/sd-forest-master-plan.md` succeeds, and `git ls-files -- sd-forest-master-plan.md` returns no path. Commit only the documentation change as `docs: add SD Forest master plan`.

### Rebuild acceptance, to be satisfied by later implementation slices

- [ ] **D01–D30:** Every DECIDED requirement has an implemented behavior and evidence; every dependent [OPEN] question has a recorded resolution rather than an implicit default.
- [ ] **D17/D30 and approved route-retention scope:** All current routes continue to resolve through owned pages or intentionally reviewed compatibility paths. Registry validation includes internal/unlisted pages without publishing them in navigation; service/asset boundaries are resolved under [OPEN] O02a/O10.
- [ ] **D01–D06/D25–D27:** Intro skip, exact-progress continuity, all seven pool windows, explicit Enter, disabled stills, Coming Soon treatment, mobile/keyboard/reduced-motion behavior, Portfolio, and secondary donations match their settled requirements; implementation detail remains [OPEN] O12/O15/O18 until resolved.
- [ ] **D06/D08–D15/D30:** Search, project cards, last meaningful updates, independent metrics, manual curation, and correct pool/page models work with real content; outstanding choices are [OPEN] O04/O05/O09/O16/O17.
- [ ] **D06/D07/D23/D28:** Consequential projects have ingested/reviewed evidence before done/Live; C2C public findings have been rederived; all featured claims and service handoffs are honest, with protocols resolved under [OPEN] O03/O06/O07.
- [ ] **D11/D17/D22/D28:** Internal tools expose only approved public documentation; Chloé documentation placement is resolved from [OPEN] O05 rather than inferred from runtime access. Host-failure behavior is useful and tested; exclusions and third-party attribution remain intact, with verification choices resolved under [OPEN] O02/O03/O14.

### Non-goals and authorization boundary

This change performs **no deployment or hosting changes**, **no route deletion**, **no merge**, and **no hidden decision**. It does not implement the rebuild, change routing/configuration, run content-producing builds, modify application code or data, publish private operational material, choose technologies/providers, set dates or fixed featured counts, choose a default Portfolio skin, push a branch, create a pull request, or release the site. Later work must follow the dependency gates and its own authorized scope. Archiving preserves the old plan as history; it does not reactivate its superseded requirements.
