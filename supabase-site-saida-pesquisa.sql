-- Pesquisa de saída das LPs de Google Ads.
-- Quem entra na página e sai sem se cadastrar responde no popup (mouse no
-- desktop, botão voltar no celular). O Worker grava via salvar_saida_pesquisa
-- (service_role). Não vira lead no CRM.
-- Aplicada no projeto yfpdrckyuxltvznqfqgh.

create table if not exists public.site_saida_pesquisa (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null,
  pagina text not null,
  norma text,
  motivo text not null,
  motivo_label text,
  detalhe text,
  detalhe_label text,
  comentario text,
  gatilho text,
  dispositivo text,
  tempo_s integer,
  rolagem_pct integer,
  form_iniciado boolean not null default false,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  gclid text,
  constraint site_saida_pesquisa_client_id_key unique (client_id)
);

create index if not exists site_saida_pesquisa_created_at_idx
  on public.site_saida_pesquisa (created_at desc);

create index if not exists site_saida_pesquisa_pagina_idx
  on public.site_saida_pesquisa (pagina);

alter table public.site_saida_pesquisa enable row level security;

revoke all on table public.site_saida_pesquisa from anon, authenticated;

create or replace function public.salvar_saida_pesquisa(p jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid := nullif(p->>'client_id', '')::uuid;
begin
  if v_client is null then
    raise exception 'client_id';
  end if;
  insert into public.site_saida_pesquisa (
    client_id, pagina, norma, motivo, motivo_label, detalhe, detalhe_label,
    comentario, gatilho, dispositivo, tempo_s, rolagem_pct, form_iniciado,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid
  ) values (
    v_client,
    p->>'pagina',
    nullif(p->>'norma', ''),
    p->>'motivo',
    nullif(p->>'motivo_label', ''),
    nullif(p->>'detalhe', ''),
    nullif(p->>'detalhe_label', ''),
    nullif(p->>'comentario', ''),
    nullif(p->>'gatilho', ''),
    nullif(p->>'dispositivo', ''),
    nullif(p->>'tempo_s', '')::int,
    nullif(p->>'rolagem_pct', '')::int,
    coalesce((p->>'form_iniciado')::boolean, false),
    nullif(p->>'utm_source', ''),
    nullif(p->>'utm_medium', ''),
    nullif(p->>'utm_campaign', ''),
    nullif(p->>'utm_content', ''),
    nullif(p->>'utm_term', ''),
    nullif(p->>'gclid', '')
  )
  on conflict (client_id) do update set
    pagina = excluded.pagina,
    norma = excluded.norma,
    motivo = excluded.motivo,
    motivo_label = excluded.motivo_label,
    detalhe = coalesce(excluded.detalhe, site_saida_pesquisa.detalhe),
    detalhe_label = coalesce(excluded.detalhe_label, site_saida_pesquisa.detalhe_label),
    comentario = coalesce(excluded.comentario, site_saida_pesquisa.comentario),
    gatilho = excluded.gatilho,
    dispositivo = excluded.dispositivo,
    tempo_s = excluded.tempo_s,
    rolagem_pct = excluded.rolagem_pct,
    form_iniciado = excluded.form_iniciado,
    utm_source = excluded.utm_source,
    utm_medium = excluded.utm_medium,
    utm_campaign = excluded.utm_campaign,
    utm_content = excluded.utm_content,
    utm_term = excluded.utm_term,
    gclid = excluded.gclid,
    updated_at = now();
end;
$$;

revoke all on function public.salvar_saida_pesquisa(jsonb) from public, anon, authenticated;
grant execute on function public.salvar_saida_pesquisa(jsonb) to service_role;
