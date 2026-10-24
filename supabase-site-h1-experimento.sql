-- Rodada 01 do H1 das LPs. Colunas novas, deduplicação e a visão do relatório.
-- Eventos com modo_teste = true ficam de fora da view.

alter table public.site_form_eventos
  add column if not exists experimento_id text,
  add column if not exists lp_id text,
  add column if not exists variante_h1 smallint,
  add column if not exists angulo text,
  add column if not exists variante_exposta smallint,
  add column if not exists angulo_exposto text,
  add column if not exists modo_teste boolean not null default false,
  add column if not exists visitante_id text,
  add column if not exists persistencia text,
  add column if not exists estado text,
  add column if not exists h1_texto text;

alter table public.site_form_eventos
  drop constraint if exists site_form_eventos_evento_check;

alter table public.site_form_eventos
  add constraint site_form_eventos_evento_check
  check (evento = any (array[
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
    'h1_falha'
  ]::text[]));

create unique index if not exists site_form_eventos_envio_ok_uidx
  on public.site_form_eventos (lead_event_id)
  where evento = 'envio_ok' and lead_event_id is not null and lead_event_id <> '';

create unique index if not exists site_form_eventos_h1_exposto_uidx
  on public.site_form_eventos (sessao_id, experimento_id)
  where evento = 'h1_exposto' and sessao_id is not null and experimento_id is not null;

create index if not exists site_form_eventos_h1_idx
  on public.site_form_eventos (experimento_id, lp_id, variante_h1)
  where experimento_id is not null;

alter table public.site_leads
  add column if not exists experimento_id text,
  add column if not exists lp_id text,
  add column if not exists variante_h1 smallint,
  add column if not exists angulo text,
  add column if not exists variante_exposta smallint,
  add column if not exists angulo_exposto text,
  add column if not exists modo_teste boolean not null default false,
  add column if not exists visitante_id text,
  add column if not exists sessao_id text,
  add column if not exists persistencia text,
  add column if not exists estado text;

create or replace view public.site_h1_rodada as
select
  e.experimento_id,
  e.lp_id,
  e.variante_h1,
  min(e.angulo) as angulo,
  count(distinct coalesce(nullif(e.visitante_id, ''), nullif(e.sessao_id, ''))) as visitantes_atribuidos,
  count(distinct coalesce(nullif(e.visitante_id, ''), nullif(e.sessao_id, '')))
    filter (where e.evento = 'h1_exposto' and e.variante_exposta = e.variante_h1) as visitantes_expostos,
  count(distinct coalesce(nullif(e.visitante_id, ''), nullif(e.sessao_id, '')))
    filter (where e.evento = 'form_inicio') as inicios_formulario,
  count(distinct e.lead_event_id)
    filter (where e.evento = 'envio_ok' and e.lead_event_id is not null and e.lead_event_id <> '') as envios_validos,
  count(*) filter (where e.evento = 'whatsapp_clique') as cliques_whatsapp,
  count(*) filter (where e.evento = 'h1_falha') as falhas_render,
  count(distinct coalesce(nullif(e.visitante_id, ''), nullif(e.sessao_id, '')))
    filter (where e.persistencia in ('sessao', 'memoria')) as falhas_persistencia
from public.site_form_eventos e
where e.modo_teste = false
  and e.estado = 'em_execucao'
  and e.variante_h1 between 1 and 5
group by e.experimento_id, e.lp_id, e.variante_h1;

comment on view public.site_h1_rodada is
  'Rodada do H1 por LP e variante. Exclui modo_teste. Nao declara vencedora.';

-- Visao exploratoria por argumento, somando LPs. Nao serve para eleger uma variante geral.
create or replace view public.site_h1_angulo as
select
  angulo,
  sum(visitantes_atribuidos) as visitantes_atribuidos,
  sum(visitantes_expostos) as visitantes_expostos,
  sum(inicios_formulario) as inicios_formulario,
  sum(envios_validos) as envios_validos,
  sum(cliques_whatsapp) as cliques_whatsapp,
  sum(falhas_render) as falhas_render,
  sum(falhas_persistencia) as falhas_persistencia
from public.site_h1_rodada
group by angulo;

comment on view public.site_h1_angulo is
  'Exploratorio: soma argumentos entre LPs. Nao define vencedora de nenhuma pagina.';
