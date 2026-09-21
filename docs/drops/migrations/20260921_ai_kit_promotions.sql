-- AI-d kit promotion layer (manual migration on The Drop's Drops database).
--
-- This is deliberately not an ingestion table.  Each row points at a
-- news_resources row that has already crossed The Drop's relevance boundary;
-- this layer only records the second question (is it a free offer?), expiry,
-- editorial review, and the public withdrawal state.  Do not copy body_text,
-- raw newsletter content, or rerun the upstream relevance classifier here.

create table if not exists public.ai_kit_promotions (
  id uuid primary key default gen_random_uuid(),
  source_resource_id uuid references public.news_resources(id) on delete restrict,
  kind text not null check (kind in ('time_boxed', 'standing_tier')),
  offer_decision text not null default 'unverified' check (offer_decision in ('free_offer', 'not_free', 'unverified')),
  status text not null default 'unverified' check (status in ('active', 'expired', 'unverified')),
  review_status text not null default 'unreviewed' check (review_status in ('approved', 'unreviewed', 'rejected', 'evidence_fixture')),
  title text not null,
  summary text not null,
  provider text,
  url text,
  expires_at timestamptz,
  last_verified_at timestamptz,
  recheck_cadence_days integer,
  withdrawn_at timestamptz,
  withdrawal_reason text,
  upstream_status text,
  upstream_source_kind text,
  upstream_evaluation jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_kit_promotions_kind_shape check (
    (kind = 'time_boxed' and expires_at is not null and last_verified_at is null and recheck_cadence_days is null)
    or
    (kind = 'standing_tier' and expires_at is null and last_verified_at is not null and recheck_cadence_days > 0)
  )
);

create index if not exists ai_kit_promotions_public_state_idx
  on public.ai_kit_promotions (status, kind, expires_at, last_verified_at);

create index if not exists ai_kit_promotions_source_resource_idx
  on public.ai_kit_promotions (source_resource_id);

alter table public.ai_kit_promotions enable row level security;

-- The public endpoint uses the service role inside an Edge Function and only
-- selects the curated fields below.  There is intentionally no anon policy on
-- the table itself, so a client cannot enumerate source rows directly.
revoke all on table public.ai_kit_promotions from anon, authenticated;

create or replace function public.withdraw_expired_ai_kit_promotions(as_of timestamptz default now())
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer := 0;
  standing_changed integer := 0;
begin
  update public.ai_kit_promotions
     set status = 'expired',
         withdrawn_at = coalesce(withdrawn_at, as_of),
         withdrawal_reason = coalesce(withdrawal_reason, 'expiry_reached'),
         updated_at = as_of
   where kind = 'time_boxed'
     and status = 'active'
     and expires_at <= as_of;
  get diagnostics changed = row_count;

  update public.ai_kit_promotions
     set status = 'unverified',
         updated_at = as_of
   where kind = 'standing_tier'
     and status = 'active'
     and last_verified_at + make_interval(days => recheck_cadence_days) <= as_of;
  get diagnostics standing_changed = row_count;

  return changed + standing_changed;
end;
$$;

revoke all on function public.withdraw_expired_ai_kit_promotions(timestamptz) from public, anon, authenticated;

-- Reviewed active time-boxed seed. The source row is already processed by The
-- Drop; this insert stores only its id, URL, status, and editorial decision.
insert into public.ai_kit_promotions (
  id, source_resource_id, kind, offer_decision, status, review_status, title, summary, provider,
  url, expires_at, upstream_status, upstream_source_kind, upstream_evaluation
)
select
  'a2e7e4b2-5a58-4d6f-a8b0-2d7c9bf46f30'::uuid,
  id,
  'time_boxed',
  'free_offer',
  'active',
  'approved',
  'Inworld Realtime TTS-2 credits',
  'Qualifying new customers can earn up to $6,500 in credits by testing and moving production traffic to Realtime TTS-2.',
  'Inworld AI',
  url,
  '2026-09-30T23:59:59Z'::timestamptz,
  status,
  source_kind,
  raw_metadata -> 'newsRelevance'
from public.news_resources
where id = '463aafcc-0a59-4bd6-a05f-f141ce494ee4'::uuid
on conflict (id) do nothing;

-- Real expired source row used only to prove automatic withdrawal. The
-- upstream evaluator rejected this broad-sale newsletter item, so it is an
-- evidence fixture and can never be rendered as an active offer.
insert into public.ai_kit_promotions (
  id, source_resource_id, kind, offer_decision, status, review_status, title, summary, provider,
  url, expires_at, upstream_status, upstream_source_kind, upstream_evaluation
)
select
  '9e0dcb55-4f52-4ec1-b4ad-0aa90e80e3b2'::uuid,
  id,
  'time_boxed',
  'not_free',
  'active',
  'evidence_fixture',
  'Brilliant Back to School offer',
  'Withdrawal evidence only: the source advertised 30% off Premium and ended after the advertised period; it was not publicly published by the upstream relevance layer.',
  'Brilliant',
  url,
  '2026-09-08T00:00:00Z'::timestamptz,
  status,
  source_kind,
  raw_metadata -> 'newsRelevance'
from public.news_resources
where id = 'f8d4d766-9627-45b8-a48b-2a248634be5d'::uuid
on conflict (id) do nothing;

-- Standing tiers are maintained separately from The Drop's evaluated corpus.
-- They never expire, but the last-verified date and cadence make shrinkage
-- visible and automatically move stale rows to UNVERIFIED.
insert into public.ai_kit_promotions (
  id, kind, offer_decision, status, review_status, title, summary, provider, url,
  last_verified_at, recheck_cadence_days
)
values
  ('b3e7b8bd-81bf-44e2-8e2d-4f35f24b8a01', 'standing_tier', 'free_offer', 'active', 'approved', 'Oracle free tier', 'Standing free tier; verify current limits before relying on it.', 'Oracle', 'https://www.oracle.com/cloud/free/', '2026-09-21T00:00:00Z', 30),
  ('c4e8c9ce-92c0-45f3-9f3e-5a46a35c9b12', 'standing_tier', 'free_offer', 'active', 'approved', 'Cloudflare 10 GB free inference', 'Standing free inference allowance; verify current limits before relying on it.', 'Cloudflare', 'https://developers.cloudflare.com/workers-ai/platform/pricing/', '2026-09-21T00:00:00Z', 30),
  ('d5f9dadf-a3d0-4604-a04f-6b57b46d0c23', 'standing_tier', 'free_offer', 'active', 'approved', 'Vercel free deployment', 'Standing free deployment tier; verify current limits before relying on it.', 'Vercel', 'https://vercel.com/pricing', '2026-09-21T00:00:00Z', 30),
  ('e6a0ebea-b4e0-4715-b15a-7c68c57e1d34', 'standing_tier', 'free_offer', 'active', 'approved', 'GitHub', 'Standing free account tier; verify current limits before relying on it.', 'GitHub', 'https://github.com/pricing', '2026-09-21T00:00:00Z', 30)
on conflict (id) do nothing;
