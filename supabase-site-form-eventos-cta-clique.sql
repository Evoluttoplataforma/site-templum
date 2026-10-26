-- Clique no botão que abre o formulário. A posição fica na coluna campo
-- (topo, meio, final, menu).

ALTER TABLE public.site_form_eventos
  DROP CONSTRAINT IF EXISTS site_form_eventos_evento_check;

ALTER TABLE public.site_form_eventos
  ADD CONSTRAINT site_form_eventos_evento_check
  CHECK (evento = ANY (ARRAY[
    'form_visivel',
    'form_inicio',
    'envio_clique',
    'envio_ok',
    'erro_validacao',
    'erro_turnstile',
    'erro_servidor',
    'erro_rede',
    'whatsapp_clique',
    'envio_sem_resposta',
    'h1_exposto',
    'h1_falha',
    'cta_clique'
  ]::text[]));
