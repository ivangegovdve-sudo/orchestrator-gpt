# Community Scientific Ingestion for SDForest

- **Status:** Approved design
- **Date:** 2026-07-14
- **Sites:** Women's Health OS and Hypertrophy OS
- **V1 client:** Windows

## Objective

Let visitors expand either scientific database with their own LlamaParse allowance without exposing their API key to SDForest. Visitors can ask Iris about under-covered subjects, receive paper suggestions, acquire and parse papers locally, submit only parsed scientific content, and see how accepted evidence changes the database.

The same contribution system must also accept papers from visitors who did not begin with a question.

## Product principles

1. A contributor's LlamaParse key never reaches SDForest infrastructure.
2. PubMed discovers candidate papers; Sci-Hub is a built-in local full-text acquisition source.
3. The paper's identity and scientific quality determine legitimacy, not its acquisition route.
4. Only verified scientific papers may ingest automatically. Other material remains pending review.
5. Routing is determined from content, not contributor preference.
6. A paper routed to both systems is parsed once but processed and stored independently in each database.
7. Legitimate low-weight and contradictory scientific evidence is retained, not omitted.
8. Private health questions are processed without persistent raw-question storage or public reuse.
9. V1 uses synthetic example questions only.
10. Production remains unchanged until a Windows build and Vercel preview pass end-to-end verification and receive owner approval.

## Existing-system boundary

The current SDForest site is a static deployment built from `orchestrator-gpt`. Women's Health OS and Hypertrophy OS already have separate Iris experiences and separate scientific data stores.

Existing backend `/ingest` surfaces must not be exposed to visitors. They accept server-side paths or arbitrary URLs and consume the owner's LlamaParse key. The public contribution design uses a new quarantine contract that:

- never accepts server-local file paths;
- never uses the owner's LlamaParse key;
- does not perform arbitrary server-side URL retrieval;
- accepts only bounded parsed contribution packages;
- separates qualification from destination-specific extraction.

## Architecture

### 1. Embedded site experience

Both OS pages expose the same contribution capabilities while retaining their own branding, question context, catalogs, results, and feedback.

Two entry points open one shared workflow:

- **Contextual:** an evidence-gap card beneath an Iris answer offers approved papers and clearly labeled unverified suggestions.
- **Always available:** a persistent **Contribute research** action accepts a DOI, URL, PDF, webpage, or video without requiring a prior question.

The ordinary answer remains the primary page content.

### 2. Shared Windows companion

One companion serves both websites and owns all sensitive local operations. It:

- binds only to `127.0.0.1`;
- permits only exact approved SDForest origins;
- requires a short-lived launch nonce and active local session;
- receives source context but never exposes local file browsing to the website;
- searches configured research sources locally;
- retrieves selected documents locally;
- calls LlamaParse using the contributor's key;
- previews the exact parsed material to be submitted;
- removes API keys and acquisition details from packages;
- queues retries or exports a local package if submission is unavailable.

The implementation plan will select the Windows packaging framework after verifying the repository patterns and installed toolchain. The product contract is independent of that framework.

### 3. Research sources

Iris uses three distinct layers:

- **Verified OS corpus:** fully ingested papers, extracted facts and rules, contradictions, provenance, and evidence weights used in answers.
- **PubMed:** live discovery, abstracts, metadata validation, related-paper suggestions, and coverage-gap detection. PubMed presence alone does not prove peer review or eligibility.
- **Sci-Hub:** built-in local acquisition of full papers by DOI or title, using `https://sci-hub.st/` as the primary source and a versioned, vetted mirror configuration for resilience. Acquisition occurs from the visitor's computer, not SDForest servers.

The normal answer cites the paper's title, authors, journal, DOI, and scientific provenance rather than the site or mirror used to obtain a copy. Companion setup contains one clear disclosure that external research services, including Sci-Hub and its configured mirrors, receive local network requests. Normal searches require no repeated prompt and do not expose mirror selection in the ordinary answer interface.

If one Sci-Hub endpoint is unavailable, the companion may try another endpoint from the signed, versioned provider configuration. The visitor can also retry, provide another URL, or select a local PDF. V1 does not crawl, execute code from, or trust arbitrary mirror lists.

### 4. Contribution gateway and quarantine

The companion submits a bounded parsed package to a new contribution gateway. The gateway stores it in quarantine, issues an anonymous receipt, performs qualification, and creates zero, one, or two destination packages.

The package includes only what qualification and extraction require:

- parsed document content and structural spans;
- title, authors, DOI, journal, publication date, and declared document type;
- content hash and parse diagnostics;
- optional originating suggestion identifier;
- traceability anchors for quotations;
- optional contributor-credit preference stored separately from scientific content.

It excludes API keys, LlamaParse account email, raw health questions, acquisition route, browser history, and local paths.

### 5. Independent destination processors

After qualification, each destination performs its own domain-specific extraction, review, storage, indexing, and evidence recalculation.

- A Women's Health OS package cannot mutate Hypertrophy OS data.
- A Hypertrophy OS package cannot mutate Women's Health OS data.
- Failure in one destination does not roll back or corrupt the other.
- A dual-routed paper is not represented by one coupled live database record.

## End-to-end flows

### Question-led contribution

1. A visitor asks Iris a health or biology question.
2. Iris answers from the verified OS corpus and clearly labels live PubMed material that is not yet ingested.
3. Iris identifies meaningful evidence gaps.
4. The page shows an approved catalog plus clearly marked unverified PubMed suggestions.
5. The visitor selects a paper and launches the Windows companion.
6. The companion attempts local full-text acquisition, including Sci-Hub, or accepts a supplied file or URL.
7. Free identity, duplicate, safety, and document checks run before spending LlamaParse tokens where possible.
8. LlamaParse produces the parsed document locally.
9. The contributor previews and submits the key-free package.
10. The gateway qualifies and routes the paper.
11. Each selected OS independently extracts and stores evidence.
12. The receipt reports accepted, pending, rejected, and per-destination outcomes.
13. Iris can show how new evidence changed conclusions or confidence.

### Direct contribution

The visitor chooses **Contribute research** without asking a question and provides a DOI, scientific URL, direct PDF URL, or local PDF. The flow then begins at local acquisition and follows the same qualification, routing, and receipt rules.

### Webpage or video contribution

A webpage or video is never automatically promoted to scientific evidence. It remains pending review. The system may extract referenced DOIs or paper titles and offer those underlying scientific papers as new candidates. Each identified paper follows the normal qualification pipeline.

## Key handling

The companion teaches three safe practices:

1. Paste a newly minted key for one session and rotate or revoke it afterward.
2. Optionally store it in Windows Credential Manager for reuse.
3. Follow an external secret-manager guide if preferred.

Session-only is the default. Keys must not appear in:

- SDForest browser storage;
- page form fields owned by the SDForest origin;
- contribution packages;
- URLs or query strings;
- logs, analytics, telemetry, or crash reports;
- exported retry packages.

## Scientific qualification

Automatic ingestion requires every mandatory check to pass with high confidence:

1. The document parses completely enough for scientific extraction.
2. Full-text title, authors, journal, and DOI agree with authoritative metadata.
3. The item is a final scientific journal publication with evidence of peer review, not merely a PubMed listing.
4. Retraction, withdrawal, and expression-of-concern checks do not disqualify active use.
5. DOI and content-hash duplicate checks pass.
6. Full content is scientifically relevant to at least one OS.
7. Population and domain routing confidence meets the automatic threshold.
8. Extracted claims remain traceable to source passages.
9. Destination-specific extraction passes internal consistency checks.

Ambiguous identity, peer-review status, parse quality, relevance, routing, or extraction sends the package to pending review. Contributors cannot override routing or verification, but may submit a correction report.

Rejected or retracted items retain only the provenance needed for audit and duplicate prevention. Retracted evidence cannot support active conclusions.

## Routing policy

Routing is based on full content:

- **Women's Health OS:** female health, biology, populations, outcomes, or sex-specific applicability.
- **Hypertrophy OS:** hypertrophy evidence plus male or general health and biology that can materially improve hypertrophy decisions, including safety evidence and counterevidence. Public claims remain limited to current demonstrated capability.
- **Both:** mixed-sex, broadly applicable, comparative, or otherwise independently useful evidence for each system.
- **Neither:** scientifically legitimate but unrelated material; retain the qualification receipt without ingesting it into either OS.

The contributor sees the classification and its explanation but cannot choose or force a destination.

## Evidence retention and weighting

Every legitimate scientific study remains discoverable, including weak and contradictory evidence. Influence is weighted using:

- study design;
- sample size and statistical power;
- controls and bias risk;
- population match;
- directness to the claim;
- replication and consistency;
- statistical and reporting quality;
- retraction or concern status.

Weak, small, indirect, animal, mechanistic, or contradictory studies appear lower and carry less influence. Iris must distinguish **evidence exists** from **evidence is strong**. Evidence is never omitted merely because its weight is low.

## Answer and catalog presentation

Each answer separates:

- Iris's current conclusion;
- confidence and evidence strength;
- supporting and contradicting studies;
- population applicability;
- database gaps;
- recently added evidence and resulting belief changes.

The approved paper catalog is versioned and owner-reviewed. On-demand Iris suggestions are visibly unverified until qualified. V1 public examples are labeled synthetic and are never represented as real community interactions.

## Privacy and abuse controls

- Raw health questions are processed transiently and excluded from application logs and analytics.
- Raw questions are not stored, republished, paraphrased, or linked to contributions.
- No account is required.
- Rate limiting uses a short-lived anonymous abuse bucket that is never stored with question text.
- Feedback contact details and contributor credit are independent opt-ins.
- The LlamaParse account email is not requested or tracked by SDForest.
- External local requests are disclosed once during companion setup.
- User-selected URLs are checked before retrieval; loopback, link-local, and private-network targets are blocked.
- File type, PDF structure, size, and malware-oriented checks run before parsing or submission.
- Submission endpoints use bounded payloads, strict schemas, anti-spam controls, and destination-independent idempotency identifiers.

## Feedback and correction reports

Both sites expose the same five levels, including after parsing and ingestion:

1. **Thanks or general note** — optional appreciation or message.
2. **Suggestion or missing topic.**
3. **Parsing, classification, or routing concern.**
4. **Potentially misleading or harmful information.**
5. **Specific factual error** — identify or quote the false claim and optionally provide supporting evidence.

Urgency changes notification and owner-review priority only. It never bypasses scientific checks or directly mutates database content. Level-five reports produce priority alerts.

Reports are anonymous by default. A visitor may independently add contact details, opt into a public contributor listing, do both, or remain anonymous. Public listings contain only the explicitly approved display name and contribution type.

Corrections create an auditable new qualification, routing, extraction, or evidence version rather than silently rewriting history.

## Failure behavior

- **Invalid or exhausted LlamaParse key:** stop locally; upload nothing.
- **Duplicate DOI:** stop before parsing where detection is possible.
- **Sci-Hub and configured mirrors unavailable:** allow another URL, local PDF, or retry.
- **Incomplete parse:** prevent automatic ingestion and preserve an optional local retry package.
- **Gateway unavailable:** queue locally or export a key-free package.
- **Qualification uncertainty:** place in pending review and list specific failed checks.
- **Destination failure:** report destinations separately; do not corrupt a successful destination.
- **Unsafe or oversized input:** reject locally before parsing.

Anonymous receipts allow status checks without an account. Receipt identifiers reveal no health question, contact information, or key material.

## Windows V1 scope

V1 includes:

- both embedded OS interfaces and both entry points;
- one shared Windows companion;
- session-only and Windows Credential Manager key modes;
- PubMed discovery and suggestions;
- built-in local Sci-Hub acquisition;
- DOI, URL, PDF, webpage, and video inputs;
- scientific qualification, routing, independent extraction, and evidence weighting;
- anonymous receipts and optional contributor identity;
- five-level feedback and correction reports;
- synthetic public examples only.

Deferred:

- macOS, Linux, and CLI companions;
- publishing real community questions;
- batch-library ingestion;
- user accounts or profiles;
- automatically treating webpages or videos as scientific evidence.

## Delivery decomposition

This is one product contract implemented through independently verifiable workstreams:

1. **Contracts and fixtures:** contribution-package schema, receipts, qualification outcomes, routing fixtures, and privacy invariants.
2. **Windows companion:** local source acquisition, key handling, LlamaParse, preview, retry, and export.
3. **Gateway and qualification:** quarantine, metadata verification, scientific gates, routing, idempotency, and status receipts.
4. **Independent destination ingestion:** Women's Health OS and Hypertrophy OS extraction, storage, indexing, and evidence recalculation.
5. **Embedded site experience:** contextual and always-available contribution paths, catalogs, progress, and result changes.
6. **Feedback and owner review:** five-level reports, contributor opt-ins, alerts, and auditable corrections.
7. **Integration and release:** security testing, Windows packaging, Vercel preview, regression checks, and owner approval.

The implementation plan must preserve this order where contracts block downstream work, while parallelizing only components that consume already-fixed interfaces. Each workstream must have its own verification gate before end-to-end release.

## Verification and acceptance criteria

### Privacy and key isolation

- Automated scans find no key in browser storage, logs, URLs, packages, exports, crash output, or SDForest traffic.
- SDForest pages cannot read companion secrets or enumerate local files.
- Raw question bodies are absent from persistent logs and analytics.
- Setup disclosure accurately identifies external local network behavior.

### Security

- Exact-origin enforcement, launch nonces, loopback binding, rate limits, schema bounds, and idempotency are tested.
- Private-network URL targets, malformed PDFs, unsupported types, oversized files, and unsafe payloads are rejected.
- Existing owner-only ingestion paths are not made public.

### Scientific pipeline

- PubMed suggestion to local Sci-Hub acquisition, LlamaParse, qualification, routing, and ingestion succeeds end to end.
- Local PDF and direct scientific URL paths succeed.
- Webpages and videos remain pending while cited papers can become candidates.
- Duplicate detection avoids token use where possible.
- Retracted, preprint, malformed, irrelevant, and ambiguous papers follow the specified outcomes.
- Women's-only, Hypertrophy-only, both, and neither fixtures route correctly.
- A dual-routed paper parses once and creates two isolated destination packages.
- Weak and contradictory studies remain visible with lower evidence weight.

### Product regression

- Current Iris answering continues to work on both sites.
- Existing site navigation, responsive behavior, accessibility, and static deployment remain functional.
- Synthetic examples are visibly labeled.
- Anonymous receipt and all five feedback levels work without an account.

## Release process

1. Develop in an isolated feature branch or worktree based on verified `origin/main`.
2. Build and test the Windows companion locally.
3. Run contract and security tests against non-production quarantine and destination fixtures.
4. Deploy the website changes to a Vercel preview.
5. Exercise the complete workflow with disposable LlamaParse credentials and test documents.
6. Verify no existing production endpoint or owner key is exposed.
7. Present the Windows build, test evidence, and Vercel preview for owner review.
8. Make no production deployment until explicit approval.

## Success definition

A visitor can privately ask an under-covered question or arrive with a paper, obtain a suggested full text locally, spend only their own LlamaParse allowance, submit no key or raw health question, receive an evidence-based automatic or pending decision, and observe independent database updates without weak scientific evidence being omitted.
