# AI-d kit — Free stuff in promotions

This surface is a read-only second layer over The Drop's already-ingested and
already-evaluated corpus. It does **not** ingest mail, fetch newsletters, copy
the corpus into SD Forest, or rerun The Drop's relevance classifier.

## Existing Drops boundary

The Drops database is the Supabase project `morning-news-anchor`. The relevant
existing tables are:

- `news_resources`: raw source metadata and the already-evaluated processing
  boundary (`status`, `source_kind`, `raw_metadata.newsRelevance`).
- `news_stories` and `news_story_resources`: grouped public-news material.
- `edition_candidates`, `edition_placements`, and `editions`: editorial
  selection and the published edition. The public API serves editorial
  placements, not an unreviewed inbox.

The new `ai_kit_promotions` table stores only a pointer to an upstream resource,
the second-layer `offer_decision` (`free_offer`, `not_free`, or `unverified`), an expiry or verification cadence, and a
small reviewed public description. It deliberately does not store `body_text`,
newsletter content, or a second copy of the Drops corpus.

## States and withdrawal

Every row is `active`, `expired`, or `unverified`. Unknown expiry and overdue
standing-tier verification are unsafe and cannot render as active. The
`withdraw_expired_ai_kit_promotions` function changes expired time-boxed rows to
`expired`, records `withdrawn_at`, and moves stale standing tiers to
`unverified`. Nothing is hard-deleted. The public Edge Function runs that
transition before selecting its response; the browser repeats the date guard so
a stale cache cannot make an ended offer look live.

`review_status = approved` is required for an active public row. The seeded
Brilliant row is a real archived Drops source row marked `evidence_fixture`: it
exists to demonstrate that an ended item is absent from the active response and
present in the archive, but it was never published as a live offer because the
upstream relevance layer rejected the broad-sale newsletter.

Standing tiers are hand-curated and independent of the Drops pipeline. The seed
set is Oracle free tier, Cloudflare 10 GB free inference, Vercel free
deployment, and GitHub. They carry `last_verified_at` and a 30-day recheck
cadence rather than an expiry. Fish Audio is not seeded until a reviewed mixed
case is available.

## Manual Supabase changes

The SQL migration in `docs/drops/migrations/20260921_ai_kit_promotions.sql` and
the Edge Function in `docs/drops/functions/ai-kit-promotions/index.ts` are
manual changes to the Drops Supabase project. They are not a Vercel migration.
The function is intentionally a public, read-only endpoint over a curated
payload; it uses the service role only inside the function, has no table-level
anon policy, and never returns source bodies or raw metadata.
