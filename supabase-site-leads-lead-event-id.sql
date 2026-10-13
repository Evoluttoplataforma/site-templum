-- Id compartilhado entre o Lead da Meta, o POST /api/lead e a conversão do Google Ads.
-- transaction_id da tag AW-17896226473 usa o mesmo valor (deduplicação).

ALTER TABLE public.site_leads
  ADD COLUMN IF NOT EXISTS lead_event_id text;

COMMENT ON COLUMN public.site_leads.lead_event_id IS
  'Id do lead compartilhado com o evento da Meta e o transaction_id da conversao do Google Ads.';
