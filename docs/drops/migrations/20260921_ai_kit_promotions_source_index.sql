-- Applied after ai_kit_promotions_20260921 to cover its foreign key.  Kept
-- idempotent so a fresh replay of the full migration remains safe.
create index if not exists ai_kit_promotions_source_resource_idx
  on public.ai_kit_promotions (source_resource_id);
