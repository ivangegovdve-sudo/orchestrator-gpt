-- Record the second-layer free-offer dimension after the base table was
-- applied. Existing approved seeds are free offers; the real archive fixture
-- is explicitly not a free offer and is never eligible for active publication.
alter table public.ai_kit_promotions
  add column if not exists offer_decision text;

update public.ai_kit_promotions
   set offer_decision = case
     when review_status = 'evidence_fixture' then 'not_free'
     when review_status = 'approved' then 'free_offer'
     else 'unverified'
   end
 where offer_decision is null;

alter table public.ai_kit_promotions
  alter column offer_decision set default 'unverified',
  alter column offer_decision set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'ai_kit_promotions_offer_decision_check'
       and conrelid = 'public.ai_kit_promotions'::regclass
  ) then
    alter table public.ai_kit_promotions
      add constraint ai_kit_promotions_offer_decision_check
      check (offer_decision in ('free_offer', 'not_free', 'unverified'));
  end if;
end;
$$;
