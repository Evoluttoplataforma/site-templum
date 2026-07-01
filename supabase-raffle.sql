-- ============================================================
-- Tabela: webinar_raffle_entries
-- Rodar no Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webinar_raffle_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webinar_slug   text NOT NULL DEFAULT 'nigel-croft-0907',
  nome           text NOT NULL,
  email          text NOT NULL,
  telefone       text NOT NULL,
  empresa        text DEFAULT '',
  nps            integer CHECK (nps >= 0 AND nps <= 10),
  raffle_number  integer,
  winner         boolean DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

-- Índice para busca rápida por webinar
CREATE INDEX IF NOT EXISTS raffle_webinar_idx ON public.webinar_raffle_entries (webinar_slug);
-- Índice único: um email por webinar
CREATE UNIQUE INDEX IF NOT EXISTS raffle_email_webinar_idx ON public.webinar_raffle_entries (email, webinar_slug);

-- RLS
ALTER TABLE public.webinar_raffle_entries ENABLE ROW LEVEL SECURITY;

-- Anônimo pode inserir (formulário público)
DROP POLICY IF EXISTS "raffle_anon_insert" ON public.webinar_raffle_entries;
CREATE POLICY "raffle_anon_insert"
  ON public.webinar_raffle_entries FOR INSERT TO anon
  WITH CHECK (true);

-- Leitura só para autenticados (worker usa service_key)
DROP POLICY IF EXISTS "raffle_service_read" ON public.webinar_raffle_entries;
CREATE POLICY "raffle_service_read"
  ON public.webinar_raffle_entries FOR SELECT TO authenticated
  USING (true);

-- Update (marcar vencedor) só para autenticados
DROP POLICY IF EXISTS "raffle_service_update" ON public.webinar_raffle_entries;
CREATE POLICY "raffle_service_update"
  ON public.webinar_raffle_entries FOR UPDATE TO authenticated
  USING (true);
