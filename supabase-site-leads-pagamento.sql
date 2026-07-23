-- ============================================================
-- Migração: rastreamento de pagamento em site_leads
-- Rodar no Supabase → SQL Editor
--
-- Usado por LPs de eventos PAGOS (ex.: Planejamento Estratégico) que
-- capturam o lead ANTES do checkout (status_pagamento='pendente') e
-- têm o status atualizado pelo webhook do Asaas (POST /api/asaas-webhook
-- em worker.js) quando o pagamento é confirmado.
--
-- Leads de captura gratuita (webinar, treinamento etc.) continuam com
-- status_pagamento NULL — a coluna só é usada pelos eventos pagos.
-- ============================================================

ALTER TABLE public.site_leads
  ADD COLUMN IF NOT EXISTS status_pagamento   text,        -- 'pendente' | 'pago'
  ADD COLUMN IF NOT EXISTS valor_pago         numeric,
  ADD COLUMN IF NOT EXISTS asaas_payment_id   text,
  ADD COLUMN IF NOT EXISTS asaas_customer_id  text,
  ADD COLUMN IF NOT EXISTS data_pagamento     timestamptz;

-- Evita processar o mesmo pagamento duas vezes (o Asaas reenvia webhook — at-least-once delivery).
CREATE UNIQUE INDEX IF NOT EXISTS site_leads_asaas_payment_id_idx
  ON public.site_leads (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;

-- Acelera a busca do webhook por e-mail + evento pendente.
CREATE INDEX IF NOT EXISTS site_leads_email_evento_idx
  ON public.site_leads (email, evento);
