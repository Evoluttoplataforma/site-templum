// Worker da Templum v3 — serve arquivos estáticos (dist) e expõe:
//   POST /api/lead          → salva lead no Supabase + Mailchimp + Templum OS + ManyChat (em paralelo)
//   POST /api/form-evento   → funil do formulário em site_form_eventos (sem dados pessoais)
//   POST /api/whatsapp-ref  → código do clique de WhatsApp em site_whatsapp_refs (sem dados pessoais)
//                             Lead comercial vai ao funil INBOUND (etapa NOVO LEAD). Não cria negócio no Pipedrive.
//                             Inscrição de evento NÃO vai ao INBOUND
//                             (ver isInscricaoEvento). Webinar ISO 9001 cai no funil MQL
//                             (tag "webinar 9001:2026") via saveToMqlWebinar (ORBIT_CRM_API_KEY).
//                             LPs de campanha (ORBIT_MQL_INSCRICAO) vão ao funil da campanha
//                             (padrão MQL Novo Lead; Nova Era: LIVES / Novo inscrito).
//                             Replay da Nova Era só etiqueta o card aberto do LIVES
//                             (L2010_REPLAY_CADASTRO). Não muda fase, não abre Inbound,
//                             não dispara E0, Meta, Mailchimp nem ManyChat.
//                             Dedup só no funil de destino (não reutiliza Teste Igor).
//                             Curso de Entendimento ISO 9001:2026 vai ao funil
//                             ATIVAÇÃO DE ALUNOS (Ignição), não ao INBOUND.
//                             Isca digital (evento "isca" / "isca-resultado") também vai
//                             ao MQL (Novo Lead, tags isca + slug + produto), não ao INBOUND.
//                             LP /iso-9001-advocacia-v2/, /consultoria/iso-9001-lp-v2/
//                             e /consultoria/pbqp-h-lp-v2/:
//                             faixas acima de R$ 100 mil vão ao INBOUND.
//                             Até R$ 100 mil vai ao MQL.
//   POST /api/track         → envia eventos ao Meta Conversions API (CAPI), server-side
//   POST   /api/saida       → pesquisa de saída das LPs de Ads (não vira lead no CRM)
//   GET    /api/saida       → leitura da pesquisa (senha Templum@2026), p/ /saida-ads
//   GET    /api/leads       → leitura interna de leads (senha protegida)
//   DELETE /api/leads       → exclui um lead no Supabase por id (senha protegida)
//   GET    /api/crm-report  → leads do funil INBOUND real da Templum (tabela templum_inbound_leads), p/ /relatorio-inbound (senha protegida, reusa LEADS_PASSWORD)
//   POST /api/asaas-webhook → recebe webhook de pagamento do Asaas (eventos pagos, ex.:
//                             Planejamento Estratégico) e marca status_pagamento='pago' no
//                             lead correspondente em site_leads (rodar supabase-site-leads-pagamento.sql antes)
//   POST /api/email-opt-out → descadastro de e-mail de marketing (LGPD). Grava a tag
//                             email-opt-out em TODOS os cards do CRM com aquele e-mail.
//                             Os Fluxos leem a tag e param. Transição: também unsub
//                             Mailchimp enquanto as lives ainda saem de lá.
//   GET  /api/email-opt-out → gera link assinado (?email=&token=LEADS_PASSWORD)
//
// Secrets/vars (Cloudflare → Worker → Settings → Variables and Secrets):
//   SUPABASE_URL           (opcional) default já no código
//   SUPABASE_ANON_KEY      (SECRETO) chave anon do Supabase
//   SUPABASE_SERVICE_KEY   (SECRETO) chave service role — necessária para GET /api/leads e para o webhook do Asaas
//   MAILCHIMP_API_KEY      ex.: abc123...-us21
//   MAILCHIMP_LIST_ID      ex.: 1a2b3c4d5e
//   MAILCHIMP_TAG          (opcional) default: site-templum
//   PIPEDRIVE_API_TOKEN    (SECRETO) token da API do Pipedrive
//   ORBIT_CRM_API_KEY      (SECRETO) chave da API do CRM Orbit (CRM → Chaves de API)
//   INTERVALO_E0_FLUXOS_SECRET (SECRETO) X-Fluxos-Secret do webhook GF (path em fluxos.e0InboundPathKey)
//   NOVA_ERA_E0_FLUXOS_SECRET (SECRETO) X-Fluxos-Secret do webhook E0 Nova Era (path nova-era-certificacao-iso-e0)
//   MQL_E0_WEBHOOK_SECRETS (SECRETO, opcional) JSON { "<path_key>": "<secret>", ... } para várias campanhas E0
//   MANYCHAT_API_KEY       (SECRETO) token da API do ManyChat (Settings → API)
//   LEADS_PASSWORD         senha para GET /api/leads (default: Templum@3321)
//   MAPADOSITE_PASSWORD    senha (Basic Auth) para /mapadosite (default: Tp3321@)
//   META_PIXEL_ID          ex.: 4177249519256900 — conta 1
//   META_CAPI_TOKEN        (SECRETO) token CAPI — conta 1
//   META_TEST_EVENT_CODE   (opcional) só para testes
//   META_PIXEL_ID_2        (opcional) 2ª conta Meta
//   META_CAPI_TOKEN_2      (opcional, SECRETO) token CAPI da 2ª conta
//   META_TEST_EVENT_CODE_2 (opcional) 2ª conta
//   ASAAS_API_KEY          (SECRETO) Chave de API do Asaas (Configurações → Integrações) — usada pra
//                          buscar nome/e-mail do cliente por customer id (o webhook não manda isso)
//   ASAAS_WEBHOOK_TOKEN    (SECRETO) token que você mesmo escolhe (32-255 chars) ao cadastrar o
//                          webhook no painel Asaas — vem de volta no header "asaas-access-token"
//   TURNSTILE_SECRET_KEY   (SECRETO) segredo do widget Turnstile invisível templum-leads.
//                          POST /api/lead só grava com token válido. Se o siteverify
//                          estiver fora, o lead segue (não perde cadastro real).
//   ZOOM_ACCOUNT_ID        (SECRETO) conta Server-to-Server do Zoom
//   ZOOM_CLIENT_ID         (SECRETO)
//   ZOOM_CLIENT_SECRET     (SECRETO)
//                          Inscrição da live (funil LIVES) cria o participante e grava
//                          o link curto no card. Vale até 20/10/2026 18h, horário de Brasília.
//
// GA4/Google Ads: tratados no navegador (gtag); server-side duplicaria eventos.
// Campanhas LP → MQL: config/mql-campaigns.json (ver docs/campanhas-mql.md).

import mqlCampaignsConfig from "./config/mql-campaigns.json";
import { sanitizeFormEvento } from "./form-evento.js";
import { camposH1, notaH1, leadEhTesteH1 } from "./h1-experimento.js";
import { sanitizeWhatsappRef } from "./whatsapp-ref.js";
import { resolveZoomShortLink } from "./zoom-short-link.js";
import {
  ZOOM_JOIN_FIELD,
  ZOOM_MEETING_ID,
  ZOOM_SHORT_FIELD,
  addMeetingRegistrant,
  splitZoomName,
  zoomAccessToken,
  zoomLinkFields,
} from "./zoom-registrant.js";

const META_API_VERSION = "v21.0";

// Lead qualificado da LP /diagnostico-de-gestao: faixas de faturamento acima de
// R$ 100 mil/mês. Precisa bater EXATAMENTE com a lista da LP (o pixel do
// navegador dispara o mesmo evento) — senão o CAPI emite sozinho e o Meta conta
// duas vezes em vez de deduplicar.
const LP_QUALIFICADO = "diagnostico-de-gestao";
const EVENTO_QUALIFICADO = "lead_qualificado_diagnostico";
const FATURAMENTO_QUALIFICADO = [
  "R$ 100 mil a R$ 300 mil",
  "R$ 300 mil a R$ 500 mil",
  "R$ 500 mil a R$ 1 milhão",
  "Acima de R$ 1 milhão",
];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Rotas de API têm prioridade — ANTES do redirect www, para não perder POST body.
    if (url.pathname === "/api/pesquisa-gf" || url.pathname === "/api/pesquisa-ne") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
      }
      if (request.method !== "POST") return corsJson({ ok: false, error: "method_not_allowed" }, 405);
      if (url.pathname === "/api/pesquisa-ne") return handlePesquisaNe(request, env);
      return handlePesquisaGf(request, env);
    }
    if (url.pathname === "/api/saida") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          },
        });
      }
      if (request.method === "POST") return handleSaida(request, env);
      if (request.method === "GET") return handleSaidaRead(request, env);
      return corsJson({ ok: false, error: "method_not_allowed" }, 405);
    }
    if (url.pathname === "/api/lead") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
      }
      if (request.method !== "POST") return corsJson({ ok: false, error: "method_not_allowed" }, 405);
      return handleLead(request, env, ctx);
    }
    if (url.pathname === "/api/form-evento") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
      }
      if (request.method !== "POST") return corsJson({ ok: false, error: "method_not_allowed" }, 405);
      return handleFormEvento(request, env);
    }
    if (url.pathname === "/api/whatsapp-ref") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
      }
      if (request.method !== "POST") return corsJson({ ok: false, error: "method_not_allowed" }, 405);
      return handleWhatsappRef(request, env);
    }
    if (url.pathname === "/api/crm-lead") {
      if (request.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
          },
        });
      }
      if (request.method !== "POST") return corsJson({ ok: false, error: "method_not_allowed" }, 405);
      return handleCrmLeadLookup(request, env);
    }
    if (url.pathname === "/api/track") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleTrack(request, env);
    }
    if (url.pathname === "/api/leads") {
      if (request.method === "GET") return handleLeadsRead(request, env);
      if (request.method === "DELETE") return handleLeadDelete(request, env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }
    if (url.pathname === "/api/crm-report") {
      if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleCrmReport(request, env);
    }
    if (url.pathname === "/api/raffle") {
      if (request.method === "POST") return handleRaffleInsert(request, env);
      if (request.method === "GET")  return handleRaffleRead(request, env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }
    if (url.pathname === "/api/raffle/draw") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleRaffleDraw(request, env);
    }
    if (url.pathname === "/api/pipedrive") {
      if (request.method !== "GET") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handlePipedriveSearch(request, env);
    }
    if (url.pathname === "/api/pipedrive-batch") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handlePipedriveBatch(request, env);
    }
    if (url.pathname === "/api/webinar-mql-backfill") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleWebinarMqlBackfill(request, env);
    }
    if (url.pathname === "/api/asaas-webhook") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleAsaasWebhook(request, env);
    }
    if (url.pathname === "/api/email-opt-out/status") {
      return handleEmailOptOutStatus(request, env);
    }
    if (url.pathname === "/api/email-opt-out") {
      if (request.method === "POST") return handleEmailOptOut(request, env);
      if (request.method === "GET") return handleEmailOptOutLink(request, env);
      return json({ ok: false, error: "method_not_allowed" }, 405);
    }

    // Canônico sem "www": www.templum.com.br/* → templum.com.br/* (301, preserva path+query).
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    if (
      url.pathname === "/nova-era-da-certificacao-iso/replay" ||
      url.pathname === "/nova-era-da-certificacao-iso/replay/"
    ) {
      url.pathname = "/a-nova-era-da-iso/replay/";
      return Response.redirect(url.toString(), 301);
    }

    if (
      url.pathname === "/programa-transicao-iso-9001-2026" ||
      url.pathname === "/programa-transicao-iso-9001-2026/"
    ) {
      url.pathname = "/curso-entendimento-iso-9001-2026/";
      return Response.redirect(url.toString(), 301);
    }

    const zoomShort = url.pathname.match(/^\/z\/([^/]+)\/?$/);
    if (zoomShort) return handleZoomShortLink(zoomShort[1], request.method, env);

    // Verificação do Google Search Console (método "Arquivo HTML").
    // A camada de assets do Workers derruba o ".html" da URL (307 p/
    // /googleb02be000df71bc63), e o verificador do Google espera 200 na URL
    // EXATA. Então servimos o próprio asset aqui, sem redirect.
    if (url.pathname === "/googleb02be000df71bc63.html") {
      const asset = new URL(request.url);
      asset.pathname = "/googleb02be000df71bc63";
      const res = await env.ASSETS.fetch(new Request(asset.toString(), request));
      return new Response(res.body, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // /mapadosite — protegido por senha (Basic Auth). Página interna, não deve ficar pública.
    if (url.pathname === "/mapadosite" || url.pathname === "/mapadosite/") {
      const expected = env.MAPADOSITE_PASSWORD || "Tp3321@";
      if (!checkBasicAuth(request, expected)) {
        return new Response("Autenticação necessária.", {
          status: 401,
          headers: { "WWW-Authenticate": 'Basic realm="Mapa do site", charset="UTF-8"' },
        });
      }
    }

    // Material da live: o arquivo é HTML. Sem attachment o navegador abre a
    // apresentação em vez de baixar quando a pessoa aperta o botão.
    if (url.pathname === REPLAY_NE_MATERIAL || url.pathname === REPLAY_NE_MATERIAL.replace(/\.html$/, "")) {
      const asset = new URL(request.url);
      asset.pathname = REPLAY_NE_MATERIAL.replace(/\.html$/, "");
      const res = await env.ASSETS.fetch(new Request(asset.toString(), request));
      if (!res.ok) return new Response("Not found", { status: 404 });
      const headers = new Headers(res.headers);
      headers.set("content-type", "text/html; charset=utf-8");
      headers.set("content-disposition", 'attachment; filename="Material-de-apoio-Nova-Era.html"');
      headers.set("cache-control", "public, max-age=3600");
      return new Response(res.body, { status: 200, headers });
    }

    // tudo o mais = arquivos estáticos (Astro build em ./dist)
    return env.ASSETS.fetch(request);
  },
};

async function handleZoomShortLink(code, method, env) {
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Not found", { status: 404 });
  }
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return new Response("Not found", { status: 404 });
  const headers = { authorization: "Bearer " + token, accept: "application/json" };
  const result = await resolveZoomShortLink({
    code,
    getLead: async (id) => {
      const res = await fetch(`${ORBIT_BASE}/leads/${id}`, { headers });
      if (!res.ok) return null;
      const payload = await res.json().catch(() => ({}));
      const lead = payload.data || payload.lead || payload;
      return lead && lead.id ? lead : null;
    },
  });
  if (result.status !== 302 || !result.location) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(null, {
    status: 302,
    headers: {
      location: result.location,
      "cache-control": "private, no-store",
    },
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function corsJson(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

function iscaSlugFrom(body) {
  const raw = String(body.isca || body.slug || "").trim();
  if (raw) return raw.replace(/^\/+|\/+$/g, "").split("/").pop();
  const pag = String(body.pagina || "");
  const m = pag.match(/\/presentes\/([^/?#]+)/i);
  if (m) return m[1];
  try {
    const u = new URL(pag, "https://templum.com.br");
    const parts = u.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch (_) {
    return "";
  }
}

function iscaNormaFromSlug(slug) {
  const s = String(slug || "").toLowerCase();
  if (/pbqp|pqo|obra|desempenho/.test(s)) return "PBQP-H";
  if (/45001|perigos/.test(s)) return "ISO 45001";
  if (/14001/.test(s)) return "ISO 14001";
  if (/27001/.test(s)) return "ISO 27001";
  if (/fssc|haccp|aliment/.test(s)) return "FSSC 22000";
  if (/9001|tartaruga|sgi|processos/.test(s)) return "ISO 9001";
  return "";
}

const TEMPLUM_SITE_ORIGIN = "https://templum.com.br";
const BLOG_SITE_ORIGIN = "https://certificacaoiso.com.br";

function stripUrlQueryHash(url) {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch (_) {
    return String(url || "").trim();
  }
}

function pathOnly(input) {
  const s = String(input || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) {
    try {
      return new URL(s).pathname || "";
    } catch (_) {
      return "";
    }
  }
  const p = s.split("?")[0].split("#")[0];
  return p.startsWith("/") ? p : `/${p}`;
}

function isBlogPath(path) {
  const p = String(path || "").toLowerCase();
  if (p.includes("certificacaoiso.com.br")) return true;
  if (/^\/consultoria\//.test(p)) return false;
  if (p === "/form/" || p === "/form") return true;
  if (/^\/presentes\//.test(p)) return true;
  if (/^\/consultoria-iso/.test(p)) return true;
  if (/^\/iso-\d/.test(p)) return true;
  if (/^\/pbqp/.test(p)) return true;
  if (/^\/passo-a-passo/.test(p)) return true;
  if (/^\/quanto-custa-iso/.test(p)) return true;
  if (/^\/certificacao-iso/.test(p)) return true;
  return false;
}

function absolutePaginaUrl(input, body) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return stripUrlQueryHash(raw);
  let path = raw.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  const evento = String(body.evento || "");
  const origin =
    evento === "blog-consultoria" || isBlogPath(path) || isBlogPath(body.content_page)
      ? BLOG_SITE_ORIGIN
      : TEMPLUM_SITE_ORIGIN;
  if (!path.endsWith("/") && !/\.\w+$/.test(path)) path += "/";
  return `${origin}${path}`;
}

/** Página de conteúdo (SEO) + página do submit; grava em lead.pagina / lead.pagina_submit. */
function applyLeadPaginaTracking(lead, body, request) {
  const submitRaw =
    body.pagina_submit ||
    body.pagina ||
    (request && request.headers.get("X-Templum-Page")) ||
    "";
  const submitUrl = absolutePaginaUrl(submitRaw, body);

  const contentCandidates = [
    body.content_page,
    body.pagina_conteudo,
    body.page,
  ].filter(Boolean);

  const landing = String(body.landing_page || body.landing || "").trim();
  if (landing) contentCandidates.push(landing);

  const campaign = String(body.utm_campaign || "").trim();
  if (
    campaign &&
    !["form-blog", "form-consultoria-artigo", "form", "site"].includes(campaign.toLowerCase())
  ) {
    contentCandidates.push(`/${campaign.replace(/^\/+|\/+$/g, "")}/`);
  }

  const referer = request ? request.headers.get("Referer") || "" : "";
  if (referer && /certificacaoiso\.com\.br/i.test(referer)) {
    contentCandidates.unshift(referer);
  }

  // Formulário enviado numa LP (não no /form/ do blog): a página desta visita
  // é a conversão. Landing e utm_campaign gravados de outra página não substituem.
  const submitPath = pathOnly(submitUrl).toLowerCase();
  const submitIsGeneric = !submitPath || submitPath === "/" || submitPath === "/form" || submitPath === "/form/";
  if (!submitIsGeneric && submitUrl) {
    lead.pagina_submit = submitUrl;
    lead.pagina = stripUrlQueryHash(submitUrl).slice(0, 480);
    const bodyReferrerEarly = String(body.referrer || body.blog_first_referrer || "").trim();
    if (bodyReferrerEarly && !lead.referrer) lead.referrer = bodyReferrerEarly.slice(0, 480);
    if (referer && !lead.referrer) lead.referrer = referer.slice(0, 480);
    return;
  }

  let contentUrl = "";
  for (const c of contentCandidates) {
    const abs = absolutePaginaUrl(c, body);
    if (!abs) continue;
    const path = pathOnly(abs).toLowerCase();
    if (path === "/form/" || path === "/form" || path === "/") continue;
    contentUrl = abs;
    break;
  }

  if (!contentUrl && submitUrl) {
    const sp = pathOnly(submitUrl).toLowerCase();
    contentUrl = sp === "/form/" || sp === "/form" ? "" : submitUrl;
  }
  if (!contentUrl && submitUrl) contentUrl = submitUrl;

  lead.pagina_submit = submitUrl || "";
  lead.pagina = contentUrl ? stripUrlQueryHash(contentUrl).slice(0, 480) : "";
  const bodyReferrer = String(body.referrer || body.blog_first_referrer || "").trim();
  if (bodyReferrer && !lead.referrer) lead.referrer = bodyReferrer.slice(0, 480);
  if (referer && !lead.referrer) lead.referrer = referer.slice(0, 480);
}

function isRootBlogPagina(pagina) {
  const p = pathOnly(pagina).toLowerCase();
  return !p || p === "/";
}

/** Blog: página de conteúdo + origem real (não direct/none do kit na /form/). */
function applyBlogLeadAttribution(lead, body) {
  if (lead.evento !== "blog-consultoria") return;

  if (isRootBlogPagina(lead.pagina)) {
    const genericCampaign = ["form-blog", "form-consultoria-artigo", "form", "site"];
    const fromContent = body.content_page || body.pagina_conteudo;
    if (fromContent) {
      lead.pagina = stripUrlQueryHash(absolutePaginaUrl(fromContent, body)).slice(0, 480);
    } else {
      const slug = String(body.utm_campaign || "").trim();
      if (slug && !genericCampaign.includes(slug.toLowerCase())) {
        lead.pagina = stripUrlQueryHash(
          absolutePaginaUrl(`/${slug.replace(/^\/+|\/+$/g, "")}/`, body),
        ).slice(0, 480);
      }
    }
  }

  const utmGeneric = (src, med) => {
    const s = String(src || "").toLowerCase();
    const m = String(med || "").toLowerCase();
    return !s || s === "direct" || m === "none";
  };

  if (utmGeneric(lead.utm_source, lead.utm_medium)) {
    const origem = String(body.origem || "").trim();
    const medFromUrl = String(body.utm_medium || "").toLowerCase();
    if (medFromUrl === "cta-artigo" || origem) {
      lead.utm_source = "blog";
      lead.utm_medium = medFromUrl === "cta-artigo" ? "cta-artigo" : "cta-artigo";
    } else if (body.utm_source_ft && String(body.utm_source_ft).toLowerCase() !== "direct") {
      lead.utm_source = String(body.utm_source_ft).trim();
      lead.utm_medium = String(body.utm_medium_ft || lead.utm_medium || "referral").trim();
    } else if (lead.utm_source_ft && String(lead.utm_source_ft).toLowerCase() !== "direct") {
      lead.utm_source = String(lead.utm_source_ft).trim();
      lead.utm_medium = String(lead.utm_medium_ft || lead.utm_medium || "referral").trim();
    } else {
      lead.utm_source = "blog";
      lead.utm_medium =
        lead.utm_medium && !utmGeneric(lead.utm_source, lead.utm_medium)
          ? lead.utm_medium
          : "organico";
    }
  }

  if (String(lead.utm_term || "").toLowerCase() === "form") {
    const term = String(body.utm_campaign || body.origem || "").trim();
    if (term) lead.utm_term = term.slice(0, 120);
  }

  const pagSlug = pathOnly(lead.pagina).replace(/^\/+|\/+$/g, "");
  const genericCampaign = ["form-blog", "form-consultoria-artigo", "form", "site", ""];
  if (pagSlug && !genericCampaign.includes(pagSlug.toLowerCase())) {
    const articleUrl = stripUrlQueryHash(absolutePaginaUrl(lead.pagina, body));
    lead.utm_campaign = (articleUrl || pagSlug).slice(0, 180);
    if (!lead.utm_term || lead.utm_term === "form" || lead.utm_term !== pagSlug) {
      lead.utm_term = pagSlug.slice(0, 120);
    }
  }

  const entrada = String(body.pagina_entrada_url || body.landing_page || "").trim();
  if (entrada && lead.mensagem && !String(lead.mensagem).includes("Entrada no blog:")) {
    lead.mensagem += `\nEntrada no blog: ${entrada}`;
  }
}

// Orgânico do site não traz utm_campaign na URL. O kit infere source/medium pelo
// referrer e guarda em cookie, mas o formulário lia só a URL. Resultado: a coluna
// UTM_CAMPAIGN do CRM ficava vazia (o referrer ia só para a nota).
const ORGANIC_REFERRER_UTM = [
  ["google.com.br", "google", "organic"],
  ["google.com", "google", "organic"],
  ["bing.com", "bing", "organic"],
  ["yahoo.com", "yahoo", "organic"],
  ["duckduckgo.com", "duckduckgo", "organic"],
  ["yandex.com", "yandex", "organic"],
  ["baidu.com", "baidu", "organic"],
  ["instagram.com", "instagram", "social"],
  ["youtube.com", "youtube", "social"],
  ["facebook.com", "facebook", "social"],
  ["fb.com", "facebook", "social"],
  ["twitter.com", "twitter", "social"],
  ["x.com", "twitter", "social"],
  ["linkedin.com", "linkedin", "social"],
  ["tiktok.com", "tiktok", "social"],
  ["pinterest.com", "pinterest", "social"],
  ["whatsapp.com", "whatsapp", "messaging"],
  ["wa.me", "whatsapp", "messaging"],
  ["t.me", "telegram", "messaging"],
  ["telegram.org", "telegram", "messaging"],
  ["reddit.com", "reddit", "social"],
  ["gemini.google.com", "gemini", "ai"],
  ["chat.openai.com", "chatgpt", "ai"],
  ["chatgpt.com", "chatgpt", "ai"],
  ["claude.ai", "claude", "ai"],
  ["poe.com", "poe", "ai"],
  ["wikipedia.org", "wikipedia", "referral"],
];
const GENERIC_UTM_CAMPAIGNS = new Set(["", "form", "site", "form-blog", "form-consultoria-artigo"]);

function referrerHost(ref) {
  try {
    return new URL(String(ref || "")).hostname.replace(/^www\./, "").toLowerCase();
  } catch (_) {
    return "";
  }
}

function isOwnSiteHost(host) {
  return (
    host === "templum.com.br" ||
    host.endsWith(".templum.com.br") ||
    host === "certificacaoiso.com.br" ||
    host.endsWith(".certificacaoiso.com.br")
  );
}

function utmFromReferrer(ref) {
  const host = referrerHost(ref);
  if (!host || isOwnSiteHost(host)) return null;
  const domains = [...ORGANIC_REFERRER_UTM].sort((a, b) => b[0].length - a[0].length);
  for (const [domain, source, medium] of domains) {
    if (host === domain || host.endsWith("." + domain)) {
      return { utm_source: source, utm_medium: medium };
    }
  }
  return { utm_source: host.slice(0, 80), utm_medium: "referral" };
}

function utmSourceMissing(src) {
  const s = String(src || "").trim().toLowerCase();
  return !s || s === "direct" || s === "(direct)";
}

function utmMediumMissing(med) {
  const m = String(med || "").trim().toLowerCase();
  return !m || m === "none";
}

function leadIsPaidClick(lead) {
  if (lead.gclid || lead.gbraid || lead.wbraid || lead.msclkid || lead.ttclid) return true;
  const m = String(lead.utm_medium || "").trim().toLowerCase();
  return ["cpc", "ppc", "paid", "paidsocial", "paid-social", "cpm", "display"].includes(m);
}

function originChannelLabel(src, med) {
  const s = String(src || "").trim().toLowerCase();
  const m = String(med || "").trim().toLowerCase();
  if (!s || s === "direct" || s === "(direct)") {
    return m && m !== "none" ? `direct-${m}` : "direct";
  }
  if (!m || m === "none") return s;
  return `${s}-${m}`;
}

function contentSlugForCampaign(pagina) {
  const path = pathOnly(pagina).replace(/^\/+|\/+$/g, "").toLowerCase();
  if (!path || path === "form") return "";
  return path.slice(0, 80);
}

function applyOrganicLeadAttribution(lead, body) {
  if (lead.evento === "blog-consultoria") return;
  if (leadIsPaidClick(lead)) return;

  if (utmSourceMissing(lead.utm_source)) {
    const inferred = utmFromReferrer(body.referrer || lead.referrer || "");
    if (inferred) {
      lead.utm_source = inferred.utm_source;
      lead.utm_medium = inferred.utm_medium;
    } else {
      lead.utm_source = "direct";
      if (utmMediumMissing(lead.utm_medium)) lead.utm_medium = "none";
    }
  } else if (utmMediumMissing(lead.utm_medium)) {
    const ref = body.referrer || lead.referrer || "";
    const inferred = utmFromReferrer(ref);
    if (inferred) {
      lead.utm_medium = inferred.utm_medium;
      const src = String(lead.utm_source || "").trim().toLowerCase();
      const host = referrerHost(ref);
      if (src === host || src === inferred.utm_source) lead.utm_source = inferred.utm_source;
    } else {
      lead.utm_medium = "referral";
    }
  }

  const camp = String(lead.utm_campaign || "").trim().toLowerCase();
  if (!GENERIC_UTM_CAMPAIGNS.has(camp)) return;

  const channel = originChannelLabel(lead.utm_source, lead.utm_medium);
  const page = contentSlugForCampaign(lead.pagina);
  lead.utm_campaign = (page ? `${channel}:${page}` : channel).slice(0, 120);

  if (utmSourceMissing(lead.utm_source_ft) && !utmSourceMissing(lead.utm_source)) {
    lead.utm_source_ft = lead.utm_source;
    lead.utm_medium_ft = lead.utm_medium;
  }
  if (!String(lead.utm_campaign_ft || "").trim()) lead.utm_campaign_ft = lead.utm_campaign;
}

// Etiqueta da norma a partir da URL de chegada. Soma, não substitui as outras.
function normaTagsFromPagina(pagina) {
  const s = String(pagina || "").toLowerCase();
  if (!s) return [];
  const tags = [];
  const add = (tag) => {
    if (tag && !tags.includes(tag)) tags.push(tag);
  };
  if (
    s.includes("iso-9001") ||
    s.includes("iso9001") ||
    s.includes("webinar-etica-cultura-qualidade") ||
    s.includes("tartaruga") ||
    s.includes("nao-conform")
  ) add("ISO 9001");
  if (s.includes("iso-14001") || s.includes("iso14001")) add("ISO 14001");
  if (s.includes("iso-27001") || s.includes("iso27001")) add("ISO 27001");
  if (s.includes("iso-45001") || s.includes("iso45001")) add("ISO 45001");
  if (s.includes("iso-42001") || s.includes("iso42001")) add("ISO 42001");
  if (s.includes("iso-37001") || s.includes("iso37001")) add("ISO 37001");
  if (s.includes("pbqp")) add("PBQP-H");
  if (s.includes("pqta")) add("PQTA");
  if (s.includes("fssc") || s.includes("22000")) add("FSSC 22000");
  if (s.includes("haccp")) add("HACCP");
  if (s.includes("sassmaq")) add("SASSMAQ");
  if (s.includes("lgpd")) add("LGPD");
  if (s.includes("esg")) add("ESG");
  if (s.includes("geric")) add("GERIC");
  if (s.includes("gestao-financeira")) add("gestão financeira");
  if (s.includes("gestao-ia-pratica")) add("Parceria LSC One");
  if (s.includes("mapeamento-sgi") || s.includes("/sgi")) add("SGI");
  return tags;
}

function withNormaTags(tags, pagina) {
  return [...new Set([...(tags || []).filter(Boolean), ...normaTagsFromPagina(pagina)])];
}

function orbitTag32(value) {
  return String(value || "").trim().slice(0, 32);
}

function iscaOrbitTags(lead) {
  const tags = ["isca"];
  if (lead.norma) tags.push(orbitTag32(lead.norma));
  for (const t of normaTagsFromPagina(lead.pagina)) tags.push(t);
  if (lead.isca) tags.push(orbitTag32(lead.isca));
  if (lead.evento === "isca-resultado") tags.push("diagnostico");
  return [...new Set(tags.filter(Boolean))];
}

// Confere Basic Auth (usuário é ignorado, só a senha importa) contra `expected`.
function checkBasicAuth(request, expected) {
  const header = request.headers.get("Authorization") || "";
  if (!header.startsWith("Basic ")) return false;
  try {
    const decoded = atob(header.slice(6));
    const pass = decoded.slice(decoded.indexOf(":") + 1);
    return pass === expected;
  } catch (_) {
    return false;
  }
}

async function sha256(value) {
  if (!value && value !== 0) return undefined;
  const norm = String(value).trim().toLowerCase();
  if (!norm) return undefined;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// MD5 puro (sem Web Crypto) — necessário para o subscriber hash do Mailchimp.
function md5hex(str) {
  function rl(n, c) { return (n << c) | (n >>> (32 - c)); }
  function ad(a, b) { return (a + b) | 0; }
  function cm(q, a, b, x, s, t) { return ad(rl(ad(ad(a, q), ad(x, t)), s), b); }
  function ff(a, b, c, d, x, s, t) { return cm((b & c) | (~b & d), a, b, x, s, t); }
  function gg(a, b, c, d, x, s, t) { return cm((b & d) | (c & ~d), a, b, x, s, t); }
  function hh(a, b, c, d, x, s, t) { return cm(b ^ c ^ d, a, b, x, s, t); }
  function ii(a, b, c, d, x, s, t) { return cm(c ^ (b | ~d), a, b, x, s, t); }
  const bytes = new TextEncoder().encode(str);
  const len = bytes.length;
  const nblk = ((len + 8) >>> 6) + 1;
  const blks = new Uint32Array(nblk * 16);
  for (let i = 0; i < len; i++) blks[i >> 2] |= bytes[i] << ((i & 3) * 8);
  blks[len >> 2] |= 0x80 << ((len & 3) * 8);
  blks[nblk * 16 - 2] = len * 8;
  let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
  for (let i = 0; i < nblk * 16; i += 16) {
    const m = blks.slice(i, i + 16);
    const [aa, bb, cc, dd] = [a, b, c, d];
    a=ff(a,b,c,d,m[0],7,-680876936);d=ff(d,a,b,c,m[1],12,-389564586);c=ff(c,d,a,b,m[2],17,606105819);b=ff(b,c,d,a,m[3],22,-1044525330);
    a=ff(a,b,c,d,m[4],7,-176418897);d=ff(d,a,b,c,m[5],12,1200080426);c=ff(c,d,a,b,m[6],17,-1473231341);b=ff(b,c,d,a,m[7],22,-45705983);
    a=ff(a,b,c,d,m[8],7,1770035416);d=ff(d,a,b,c,m[9],12,-1958414417);c=ff(c,d,a,b,m[10],17,-42063);b=ff(b,c,d,a,m[11],22,-1990404162);
    a=ff(a,b,c,d,m[12],7,1804603682);d=ff(d,a,b,c,m[13],12,-40341101);c=ff(c,d,a,b,m[14],17,-1502002290);b=ff(b,c,d,a,m[15],22,1236535329);
    a=gg(a,b,c,d,m[1],5,-165796510);d=gg(d,a,b,c,m[6],9,-1069501632);c=gg(c,d,a,b,m[11],14,643717713);b=gg(b,c,d,a,m[0],20,-373897302);
    a=gg(a,b,c,d,m[5],5,-701558691);d=gg(d,a,b,c,m[10],9,38016083);c=gg(c,d,a,b,m[15],14,-660478335);b=gg(b,c,d,a,m[4],20,-405537848);
    a=gg(a,b,c,d,m[9],5,568446438);d=gg(d,a,b,c,m[14],9,-1019803690);c=gg(c,d,a,b,m[3],14,-187363961);b=gg(b,c,d,a,m[8],20,1163531501);
    a=gg(a,b,c,d,m[13],5,-1444681467);d=gg(d,a,b,c,m[2],9,-51403784);c=gg(c,d,a,b,m[7],14,1735328473);b=gg(b,c,d,a,m[12],20,-1926607734);
    a=hh(a,b,c,d,m[5],4,-378558);d=hh(d,a,b,c,m[8],11,-2022574463);c=hh(c,d,a,b,m[11],16,1839030562);b=hh(b,c,d,a,m[14],23,-35309556);
    a=hh(a,b,c,d,m[1],4,-1530992060);d=hh(d,a,b,c,m[4],11,1272893353);c=hh(c,d,a,b,m[7],16,-155497632);b=hh(b,c,d,a,m[10],23,-1094730640);
    a=hh(a,b,c,d,m[13],4,681279174);d=hh(d,a,b,c,m[0],11,-358537222);c=hh(c,d,a,b,m[3],16,-722521979);b=hh(b,c,d,a,m[6],23,76029189);
    a=hh(a,b,c,d,m[9],4,-640364487);d=hh(d,a,b,c,m[12],11,-421815835);c=hh(c,d,a,b,m[15],16,530742520);b=hh(b,c,d,a,m[2],23,-995338651);
    a=ii(a,b,c,d,m[0],6,-198630844);d=ii(d,a,b,c,m[7],10,1126891415);c=ii(c,d,a,b,m[14],15,-1416354905);b=ii(b,c,d,a,m[5],21,-57434055);
    a=ii(a,b,c,d,m[12],6,1700485571);d=ii(d,a,b,c,m[3],10,-1894986606);c=ii(c,d,a,b,m[10],15,-1051523);b=ii(b,c,d,a,m[1],21,-2054922799);
    a=ii(a,b,c,d,m[8],6,1873313359);d=ii(d,a,b,c,m[15],10,-30611744);c=ii(c,d,a,b,m[6],15,-1560198380);b=ii(b,c,d,a,m[13],21,1309151649);
    a=ii(a,b,c,d,m[4],6,-145523070);d=ii(d,a,b,c,m[11],10,-1120210379);c=ii(c,d,a,b,m[2],15,718787259);b=ii(b,c,d,a,m[9],21,-343485551);
    a=ad(a,aa);b=ad(b,bb);c=ad(c,cc);d=ad(d,dd);
  }
  return [a,b,c,d].map(n => {
    const h = (n < 0 ? n + 0x100000000 : n).toString(16).padStart(8, "0");
    return h[6]+h[7]+h[4]+h[5]+h[2]+h[3]+h[0]+h[1];
  }).join("");
}

// Helper: limita o tempo de espera de cada task externa (ms).
// Garante que Promise.all retorna em no máximo `ms` mesmo se uma API travar.
function timed(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(resolve) { setTimeout(function() { resolve({ timeout: true }); }, ms); }),
  ]);
}

// =====================================================================
// LEAD: Supabase, Mailchimp, Templum OS (INBOUND). Pipedrive não recebe lead novo.
// =====================================================================

async function handleCrmLeadLookup(request, env) {
  let body = {};
  try { body = await request.json(); } catch (_) {}
  const email = normalizeEmail(body.email || "");
  if (!email || email.indexOf("@") === -1) return corsJson({ ok: false, error: "email" }, 400);
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return corsJson({ ok: true, found: false });
  try {
    const found = await crmFindLeadsForIsca(token, email, "");
    const lead = pickCrmLeadForIsca(found);
    if (!lead) return corsJson({ ok: true, found: false });
    return corsJson({
      ok: true,
      found: true,
      nome: lead.contact_name || "",
      empresa: lead.company_name || lead.title || "",
      telefone: lead.contact_phone || "",
    });
  } catch (_) {
    return corsJson({ ok: true, found: false });
  }
}

const TURNSTILE_FAIL_OPEN = new Set([
  "missing-input-secret",
  "invalid-input-secret",
  "internal-error",
]);

// Token ausente ou inválido bloqueia. Falha de rede, 5xx ou segredo
// mal configurado libera o lead: parar o formulário porque a Cloudflare
// não respondeu perderia cadastro de verdade.
async function verifyTurnstile(token, request, env) {
  const secret = env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error("[lead:turnstile] TURNSTILE_SECRET_KEY ausente, envio liberado");
    return { ok: true, skipped: "not_configured" };
  }
  const value = String(token || "").trim();
  if (!value) return { ok: false, reason: "missing_token" };

  const ip = request.headers.get("cf-connecting-ip") || "";
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ secret, response: value, remoteip: ip }),
      signal: AbortSignal.timeout(2500),
    });
    if (r.status >= 500) {
      console.error("[lead:turnstile] siteverify", r.status);
      return { ok: true, skipped: "upstream_" + r.status };
    }
    const data = await r.json().catch(() => null);
    if (!data) {
      console.error("[lead:turnstile] resposta invalida");
      return { ok: true, skipped: "bad_response" };
    }
    if (data.success) return { ok: true };
    const codes = Array.isArray(data["error-codes"]) ? data["error-codes"] : [];
    if (codes.some((c) => TURNSTILE_FAIL_OPEN.has(c))) {
      console.error("[lead:turnstile] fail open", JSON.stringify(codes));
      return { ok: true, skipped: codes.join(",") };
    }
    return { ok: false, reason: "invalid_token" };
  } catch (e) {
    console.error("[lead:turnstile] siteverify indisponivel", e && e.message);
    return { ok: true, skipped: "unreachable" };
  }
}

// Funil do formulário. A service role grava só o que sanitizeFormEvento deixa passar.
async function handleFormEvento(request, env) {
  let raw = "";
  try { raw = await request.text(); } catch (_) { return corsJson({ ok: false }, 400); }
  if (!raw || raw.length > 4000) return corsJson({ ok: false }, 400);
  let body = null;
  try { body = JSON.parse(raw); } catch (_) { return corsJson({ ok: false }, 400); }
  const row = sanitizeFormEvento(body);
  if (!row) return corsJson({ ok: false }, 400);

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  if (!sbKey) return corsJson({ ok: false }, 503);

  try {
    const r = await fetch(`${sbUrl}/rest/v1/site_form_eventos`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: sbKey,
        authorization: "Bearer " + sbKey,
        prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (r.ok || r.status === 409) return corsJson({ ok: true });
    const err = await r.text().catch(() => "");
    console.error("[form-evento]", r.status, err.slice(0, 180));
    return corsJson({ ok: false }, 502);
  } catch (e) {
    console.error("[form-evento] fetch", e && e.message);
    return corsJson({ ok: false }, 502);
  }
}

async function handleWhatsappRef(request, env) {
  let raw = "";
  try { raw = await request.text(); } catch (_) { return corsJson({ ok: false }, 400); }
  if (!raw || raw.length > 4000) return corsJson({ ok: false }, 400);
  let body = null;
  try { body = JSON.parse(raw); } catch (_) { return corsJson({ ok: false }, 400); }
  const row = sanitizeWhatsappRef(body);
  if (!row) return corsJson({ ok: false }, 400);

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  if (!sbKey) return corsJson({ ok: false }, 503);

  try {
    const r = await fetch(`${sbUrl}/rest/v1/site_whatsapp_refs`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: sbKey,
        authorization: "Bearer " + sbKey,
        prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
    if (r.ok) return corsJson({ ok: true });
    const err = await r.text().catch(() => "");
    console.error("[whatsapp-ref]", r.status, err.slice(0, 180));
    return corsJson({ ok: false }, 502);
  } catch (e) {
    console.error("[whatsapp-ref] fetch", e && e.message);
    return corsJson({ ok: false }, 502);
  }
}

async function handleLead(request, env, ctx) {
  let body = {};
  try { body = await request.json(); } catch (_) { return corsJson({ ok: false, error: "invalid_json" }, 400); }

  const turnstile = await verifyTurnstile(body.turnstile_token, request, env);
  if (!turnstile.ok) return corsJson({ ok: false, error: "turnstile" }, 403);

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return corsJson({ ok: false, error: "invalid_email" }, 422);

  const iscaSlug = iscaSlugFrom(body);
  const lead = {
    nome: body.nome || "",
    email,
    telefone: body.telefone || "",
    empresa: body.empresa || "",
    norma: body.norma || "",
    cargo: body.cargo || "",
    urgencia: body.urgencia || "",
    funcionarios: body.funcionarios || "",
    faturamento: body.faturamento || "",
    mensagem: body.mensagem || "",
    // "Maior desafio da empresa hoje" — select das LPs (ex.: /planejamento-estrategico-2027).
    // Separado de `mensagem` (texto livre) para virar campo próprio no Supabase e no CRM.
    desafio: body.desafio || "",
    status_pagamento: body.status_pagamento || "",
    evento: body.evento || "lead",
    pagina: body.pagina || "",
    isca: iscaSlug,
    session_id: body.session_id || "",
    utm_source: body.utm_source || "",
    utm_medium: body.utm_medium || "",
    utm_campaign: body.utm_campaign || "",
    utm_term: body.utm_term || "",
    utm_content: body.utm_content || "",
    gclid: body.gclid || "",
    fbclid: body.fbclid || "",
    gbraid: body.gbraid || "",
    wbraid: body.wbraid || "",
    gad_source: body.gad_source || "",
    gad_campaignid: body.gad_campaignid || "",
    msclkid: body.msclkid || "",
    ttclid: body.ttclid || "",
    utm_source_ft: body.utm_source_ft || "",
    utm_medium_ft: body.utm_medium_ft || "",
    utm_campaign_ft: body.utm_campaign_ft || "",
    utm_term_ft: body.utm_term_ft || "",
    utm_content_ft: body.utm_content_ft || "",
    fbp: body.fbp || "",
    fbc: body.fbc || "",
    landing: body.landing || "",
    // Meta: id compartilhado com o Lead do navegador (dedup) e content_name
    // igual ao do pixel — sem ele, custom conversion filtrada por content_name
    // não casava com os eventos server-side.
    meta_event_id: body.meta_event_id || "",
    meta_content_name: body.meta_content_name || "",
    // Mesmo id do Lead da Meta e do transaction_id do Google Ads.
    lead_event_id: String(body.lead_event_id || body.meta_event_id || "").slice(0, 80),
  };
  Object.assign(lead, camposH1(body));

  if (lead.evento === "nova-era-certificacao-iso" || lead.evento === REPLAY_NE_EVENT) {
    const d = brMobileDigits(lead.telefone);
    if (!isBrWhatsappMobile(d)) {
      return corsJson({ ok: false, error: "invalid_phone" }, 422);
    }
    lead.telefone = formatBrWhatsappMask(d);
  }

  applyMqlLpAttribution(lead);
  applySegmentLpUtmDefaults(lead, body);
  applyLeadPaginaTracking(lead, body, request);
  applyBlogLeadAttribution(lead, body);
  applyOrganicLeadAttribution(lead, body);
  applyConsultoriaLpCampaign(lead, body);

  const isIsca =
    lead.evento === "isca" ||
    lead.evento === "isca-resultado" ||
    /^\/presentes\//.test(lead.pagina);
  if (isIsca && !lead.norma) lead.norma = iscaNormaFromSlug(lead.isca || lead.pagina);
  if (isIsca && !lead.evento.startsWith("isca")) lead.evento = "isca";

  // Inscrição em evento NÃO vai ao INBOUND (em agosto/2026 as 59 da
  // LP PE2027 inflaram perda). Webinar 9001 e isca digital vão ao funil MQL (nutrição).
  const isInscricaoEvento =
    lead.evento.startsWith("webinar") ||
    lead.evento.startsWith("webserie") ||
    lead.evento === "planejamento-estrategico-2027" ||
    lead.evento === REPLAY_NE_EVENT ||
    MQL_CAMPAIGN_SLUG_SET.has(lead.evento) ||
    isIsca;

  // Estratégia: salva no Supabase primeiro (aguarda, max 3s) e responde ao browser.
  // Mailchimp + Templum OS (INBOUND) + Meta CAPI rodam em background via ctx.waitUntil.
  const supabase = await timed(saveToSupabase(lead, env), 3000);

  const isResultado = lead.evento === "isca-resultado";
  const isReplay = lead.evento === REPLAY_NE_EVENT;
  const testeH1 = leadEhTesteH1(lead);
  const bgTasks = [];
  if (!testeH1 && !isResultado && !isReplay) {
    bgTasks.push(["mailchimp", saveToMailchimp(lead, env)]);
    bgTasks.push(["meta", sendMetaLead(lead, env, request)]);
    bgTasks.push(["manychat", saveToManyChat(lead, env)]);
  }
  const isCursoAluno =
    lead.evento === "curso-entendimento-iso-9001-2026" ||
    String(lead.evento || "").startsWith("curso-");

  if (testeH1) {
    console.log("[lead:h1-teste]", lead.experimento_id || "", lead.lp_id || "", lead.variante_h1 || "");
  } else if (isReplay) {
    bgTasks.push(["replay", saveReplayCadastro(lead, env)]);
  } else if (isCursoAluno) {
    bgTasks.push(["orbit", saveToOrbit(lead, env, {
      pipeline_id: ORBIT_ATIVACAO_PIPELINE_ID,
      stage_id: ORBIT_ATIVACAO_STAGE_IGNICAO,
    })]);
  } else if (isFaturamentoMql(lead)) {
    // Até R$ 100 mil nestas LPs não entra no INBOUND. Vai ao funil MQL.
    bgTasks.push(["mql", saveToMqlPorFaturamento(lead, env)]);
  } else if (!isInscricaoEvento) {
    // CRM comercial: Templum OS, funil INBOUND, etapa NOVO LEAD. Sem Pipedrive.
    bgTasks.push(["orbit", saveToOrbit(lead, env)]);
  } else if (lead.evento.startsWith("webinar")) {
    bgTasks.push(["mql", saveToMqlWebinar(lead, env)]);
  } else if (ORBIT_MQL_INSCRICAO[lead.evento]) {
    bgTasks.push(["mql", saveToMqlInscricao(lead, env)]);
  } else if (isIsca) {
    bgTasks.push(["mql", saveToMqlIsca(lead, env)]);
  }

  // Loga falhas (ok:false ou exceção) de cada tarefa em background — sem isso,
  // erros ficam completamente invisíveis (ctx.waitUntil não expõe o resultado).
  ctx.waitUntil(Promise.all(bgTasks.map(([name, task]) =>
    task
      .then((r) => { if (r && r.ok === false) console.error(`[lead:${name}]`, JSON.stringify(r)); })
      .catch((e) => console.error(`[lead:${name}] exception`, e && e.message))
  )));

  // A resposta segue ok:true mesmo se o Supabase falhar — o lead ainda foi para
  // Mailchimp/ManyChat/Meta (e CRM, quando não é evento), então não faz sentido
  // mostrar erro para o visitante. Mas GRITA no log: foi exatamente esse
  // ok:true silencioso que deixou a falha de 01/09 passar 7 dias sem ninguém ver.
  if (supabase && supabase.ok === false) {
    console.error("[lead:supabase] INSERT FALHOU", JSON.stringify(supabase));
  }

  return corsJson({ ok: true, supabase });
}

// ---- 1) Supabase -------------------------------------------------------
async function saveToSupabase(lead, env) {
  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  // SERVICE_KEY, não ANON_KEY: o insert acontece só aqui dentro do Worker, e em
  // 01/09 o papel `anon` perdeu o GRANT INSERT em site_leads (a policy de RLS
  // "insert livre" continuou lá, mas policy não substitui grant). Resultado: de
  // 01/09 a 08/09 todo POST /api/lead falhou com 42501 e nenhum lead foi gravado.
  const sbKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  if (!sbKey) return { ok: false, reason: "not_configured" };

  try {
    // status_pagamento só é enviado quando o form o preenche (produtos pagos) — assim
    // um site_leads sem a coluna ainda (migração não rodada) não quebra os outros leads.
    const payload = {
      nome: lead.nome, email: lead.email, telefone: lead.telefone,
      empresa: lead.empresa, norma: lead.norma, cargo: lead.cargo,
      funcionarios: lead.funcionarios, urgencia: lead.urgencia,
      faturamento: lead.faturamento,
      mensagem: lead.mensagem, desafio: lead.desafio,
      evento: lead.evento, pagina: lead.pagina,
      utm_source: lead.utm_source, utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign, utm_content: lead.utm_content,
      utm_source_ft: lead.utm_source_ft, utm_medium_ft: lead.utm_medium_ft,
      utm_campaign_ft: lead.utm_campaign_ft,
      gclid: lead.gclid, fbclid: lead.fbclid,
      gbraid: lead.gbraid, wbraid: lead.wbraid,
    };
    if (lead.lead_event_id) payload.lead_event_id = lead.lead_event_id;
    if (lead.status_pagamento) payload.status_pagamento = lead.status_pagamento;
    if (lead.experimento_id) {
      payload.experimento_id = lead.experimento_id;
      payload.lp_id = lead.lp_id || "";
      if (lead.variante_h1) payload.variante_h1 = lead.variante_h1;
      if (lead.angulo) payload.angulo = lead.angulo;
      if (lead.variante_exposta) payload.variante_exposta = lead.variante_exposta;
      if (lead.angulo_exposto) payload.angulo_exposto = lead.angulo_exposto;
      if (lead.modo_teste) payload.modo_teste = true;
      if (lead.visitante_id) payload.visitante_id = lead.visitante_id;
      if (lead.sessao_id) payload.sessao_id = lead.sessao_id;
      if (lead.persistencia) payload.persistencia = lead.persistencia;
      if (lead.estado) payload.estado = lead.estado;
    }

    const r = await fetch(`${sbUrl}/rest/v1/site_leads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": sbKey,
        "authorization": "Bearer " + sbKey,
        "prefer": "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (r.ok) return { ok: true };
    const e = await r.text().catch(() => "");
    return { ok: false, error: e.slice(0, 120) };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// ---- 2) Mailchimp -------------------------------------------------------
async function saveToMailchimp(lead, env) {
  if (!env.MAILCHIMP_API_KEY || !env.MAILCHIMP_LIST_ID) return { ok: false, reason: "not_configured" };
  const dc = env.MAILCHIMP_API_KEY.split("-")[1];
  if (!dc) return { ok: false, reason: "invalid_key" };

  const auth = "Basic " + btoa("anystring:" + env.MAILCHIMP_API_KEY);
  const mcBase = `https://${dc}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}`;
  const hash = md5hex(lead.email);
  const mcTags = [
    env.MAILCHIMP_TAG || "site-templum",
    ...(lead.evento && lead.evento !== "lead" ? [lead.evento] : []),
  ];
  // Agregado da série da ISO 9001: até aqui só existia a tag da data
  // (webinar-gestao-treinamentos-0909 etc.), sem nada que juntasse a série
  // inteira — o mesmo problema que o webserie_ISO9001 resolve no ManyChat.
  // O Mailchimp casa tag por NOME: se o segmento "Webserie" já existir na
  // audiência, o lead entra nele; se não, é criado no primeiro lead.
  if (lead.evento.startsWith("webinar") || lead.evento.startsWith("webserie")) {
    mcTags.push("Webserie");
  }
  mcTags.push(...nutricaoTagsForMqlCampaign(lead.evento, "mailchimp"));

  try {
    const r = await fetch(`${mcBase}/members`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: auth },
      body: JSON.stringify({
        email_address: lead.email,
        status: "subscribed",
        merge_fields: {
          FNAME: lead.nome, PHONE: lead.telefone, COMPANY: lead.empresa,
          NORMA: lead.norma, CARGO: lead.cargo, URGENCIA: lead.urgencia,
          FUNCIONARI: lead.funcionarios, MENSAGEM: lead.mensagem || lead.desafio,
          ORIGEM: lead.pagina || lead.evento || "site",
          LT_SOURCE: lead.utm_source,    LT_MEDIUM: lead.utm_medium,
          LT_CAMP: lead.utm_campaign,    LT_CONTENT: lead.utm_content,
          LT_TERM: lead.utm_term,
          FT_SOURCE: lead.utm_source_ft, FT_MEDIUM: lead.utm_medium_ft,
          FT_CAMP: lead.utm_campaign_ft, FT_CONTENT: lead.utm_content_ft,
          FT_TERM: lead.utm_term_ft,
        },
        tags: mcTags,
      }),
    });
    if (r.ok) return { ok: true };

    const e = await r.json().catch(() => ({}));
    if (e && e.title === "Member Exists") {
      // Contato já existe → atualiza dados + adiciona tag (dispara automações).
      await Promise.all([
        fetch(`${mcBase}/members/${hash}`, {
          method: "PUT",
          headers: { "content-type": "application/json", authorization: auth },
          body: JSON.stringify({
            email_address: lead.email, status_if_new: "subscribed",
            merge_fields: {
              FNAME: lead.nome, PHONE: lead.telefone, COMPANY: lead.empresa,
              NORMA: lead.norma, CARGO: lead.cargo, URGENCIA: lead.urgencia,
              FUNCIONARI: lead.funcionarios, MENSAGEM: lead.mensagem || lead.desafio,
              ORIGEM: lead.pagina || lead.evento || "site",
              LT_SOURCE: lead.utm_source,    LT_MEDIUM: lead.utm_medium,
              LT_CAMP: lead.utm_campaign,    LT_CONTENT: lead.utm_content,
              LT_TERM: lead.utm_term,
              FT_SOURCE: lead.utm_source_ft, FT_MEDIUM: lead.utm_medium_ft,
              FT_CAMP: lead.utm_campaign_ft, FT_CONTENT: lead.utm_content_ft,
              FT_TERM: lead.utm_term_ft,
            },
          }),
        }).catch(() => null),
        fetch(`${mcBase}/members/${hash}/tags`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: auth },
          body: JSON.stringify({ tags: mcTags.map(name => ({ name, status: "active" })) }),
        }).catch(() => null),
      ]);
      return { ok: true, existing: true };
    }
    return { ok: false, error: e.title || "mailchimp_error" };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// ---- 3) Pipedrive -------------------------------------------------------
// /api/lead não chama mais isto. Lead comercial vai ao Templum OS (INBOUND).
// A função fica só como histórico; a tela interna /leads ainda consulta o Pipedrive
// por GET /api/pipedrive e POST /api/pipedrive-batch (leitura, não cria negócio).
// Pipeline antigo: INBOUND (id=1) → Stage NOVO LEAD (id=218)
const PD_BASE = "https://api.pipedrive.com/v1";
const PD_PIPELINE = 1;
const PD_STAGE = 218;
// Chaves dos campos customizados (obtidas via /v1/dealFields)
const PD_FIELDS = {
  utm_source:      "92f5fbfb2cfdcbe4d46a72b5acf06ca15f29ac14",
  utm_medium:      "15bdeb9558dc89ed77d92cbfa0d04a4ee26d4d1f",
  utm_campaign:    "6b578f95362c28ee95473982525671ff43435b38",
  utm_term:        "5c22fd65ac5f7dbfbef6c07347fde9154bcdc385",
  utm_content:     "921482eae8dae5a8b2c830100038a17801df8b45",
  utm_source_ft:   "06754c74401e609e506d01d3a928f8d3025ad43e",
  utm_medium_ft:   "a335961b5cded844362e09480b5ca68048e33404",
  utm_campaign_ft: "6bc82d18de3ae4574c4f8b8185a1dfa7e43cd5d0",
  utm_term_ft:     "3ba67d7950d346b4b6dd0d4bbb8974a007a53aee",
  utm_content_ft:  "ba178b2651759509012cfad3beac506f51d12a27",
  norma:           "88b449e175d73d74792f6f1b54f7724c5d4ae2c9",
  cargo:           "def95ff43857bf5b0306029dde8531907148a09e",
  urgencia:        "16c22c632d4aed9dfce0949287ac750729765ab1",
  funcionarios:    "fbf8ddfc6cdea3ac8571999d49d507fd40575c74",
  necessidade:     "1ad267ed98d0ae5286cb5f0189186ecb5d41f865",
  pagina:          "79a54756633069b9f0a508f6869780c6c2b52be2",
  gclid:           "9aeff85ea6f6fe1bedbe6e67cfd5eb612a7257ab",
  fbclid:          "143f49947826ce1d1b3e995baa842e96de518e74",
  fbp:             "87df328012b737dcd7cb6c95c3e5284f23e20748",
  fbc:             "63a82ccf1e419bdf8aef5680c70e074104dafb0e",
  gad_source:      "16cadd6acb21432129c344bfc2b4f34dbd7deec9",
  gad_campaignid:  "9a4fcacaff9851ca9ccf83980210b1644a0d1e04",
  session_id:      "43091e3081136004843998d26c80abe6a7cb78b0",
};
// Campos customizados da Organização (obtidas via /v1/organizationFields) — escopo separado do deal.
const PD_ORG_FIELDS = {
  faturamento: "d05e9330fb1c1e577799c536f41d800627fbc917",
};

async function saveToPipedrive(lead, env) {
  const token = env.PIPEDRIVE_API_TOKEN;
  if (!token) return { ok: false, reason: "not_configured" };

  try {
    // 1) Organização (empresa)
    let org_id = null;
    if (lead.empresa) {
      const orgBody = { name: lead.empresa };
      for (const [field, key] of Object.entries(PD_ORG_FIELDS)) {
        const val = lead[field];
        if (val) orgBody[key] = val;
      }

      let r = await fetch(`${PD_BASE}/organizations?api_token=${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(orgBody),
      }).catch(() => null);

      // Fallback: se falhou (ex.: key de campo customizado inválida), tenta de
      // novo só com o nome — não perder a organização por causa de 1 campo.
      if (!r || !r.ok) {
        r = await fetch(`${PD_BASE}/organizations?api_token=${token}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: lead.empresa }),
        }).catch(() => null);
      }

      if (r && r.ok) {
        const d = await r.json().catch(() => ({}));
        org_id = d.data?.id || null;
      }
    }

    // 2) Pessoa
    const personBody = {
      name: lead.nome || lead.email,
      email: [{ value: lead.email, primary: true, label: "work" }],
    };
    if (lead.telefone) personBody.phone = [{ value: lead.telefone, primary: true, label: "work" }];
    if (org_id) personBody.org_id = org_id;

    const rp = await fetch(`${PD_BASE}/persons?api_token=${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(personBody),
    }).catch(() => null);

    let person_id = null;
    if (rp && rp.ok) {
      const d = await rp.json().catch(() => ({}));
      person_id = d.data?.id || null;
    }

    // 3) Deal
    const title = [lead.empresa || lead.nome || lead.email, lead.norma].filter(Boolean).join(" - ");
    const dealBody = { title, pipeline_id: PD_PIPELINE, stage_id: PD_STAGE };
    if (person_id) dealBody.person_id = person_id;
    if (org_id) dealBody.org_id = org_id;

    // Campos customizados — só preenche se tiver valor
    for (const [field, key] of Object.entries(PD_FIELDS)) {
      const val = lead[field] || (field === "necessidade" ? (lead.mensagem || lead.desafio) : "");
      if (val) dealBody[key] = val;
    }

    let rd = await fetch(`${PD_BASE}/deals?api_token=${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dealBody),
    }).catch(() => null);

    if (rd && rd.ok) {
      const d = await rd.json().catch(() => ({}));
      return { ok: true, deal_id: d.data?.id };
    }

    // Fallback: se falhou (ex.: key de campo customizado inválida), tenta de
    // novo só com os campos essenciais — não perder o deal por causa de 1 campo.
    const basicBody = { title, pipeline_id: PD_PIPELINE, stage_id: PD_STAGE };
    if (person_id) basicBody.person_id = person_id;
    if (org_id) basicBody.org_id = org_id;
    rd = await fetch(`${PD_BASE}/deals?api_token=${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(basicBody),
    }).catch(() => null);

    if (rd && rd.ok) {
      const d = await rd.json().catch(() => ({}));
      return { ok: true, deal_id: d.data?.id, fields_dropped: true };
    }
    const e = rd ? await rd.text().catch(() => "") : "fetch_failed";
    return { ok: false, error: String(e).slice(0, 140) };

  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// ---- 3b) CRM Orbit ---------------------------------------------------------
// Pipeline INBOUND ("Importado do Pipedrive") → Stage NOVO LEAD
const ORBIT_BASE = "https://cvanwvoddchatcdstwry.supabase.co/functions/v1/crm-api-v1/v1";
const FLUXOS_WEBHOOK_INBOUND_BASE =
  "https://cvanwvoddchatcdstwry.supabase.co/functions/v1/fluxos-webhook-inbound";
const ORBIT_PIPELINE_ID = "346d6495-1a81-4776-b3d4-bf86d0edf3b4";
const ORBIT_STAGE_ID = "8d480f12-283d-4d2b-b839-2934b73adf4a";
const ORBIT_ATIVACAO_PIPELINE_ID = "39587fe2-8d8a-4c54-b505-fb67d9f04b10";
const ORBIT_ATIVACAO_STAGE_IGNICAO = "1fec2ce2-2a71-47ce-8717-ea9746e98ecd";
const ORBIT_TAG_PARCERIA_LSC = "Parceria LSC One";
const ORBIT_MQL_PIPELINE_ID = "519a684f-c522-4aeb-b14d-371986de41c6";
const ORBIT_MQL_STAGE_NOVO = "034f7c0f-6668-4d08-a053-061bb1ae050e";
const ORBIT_LIVES_PIPELINE_ID = "9638c34e-def9-40b6-bb6a-b80210960f70";
const ORBIT_LIVES_STAGE_NOVO_INSCRITO = "fa3c2273-29c8-4df4-bdb1-2f6a993c059f";
const REPLAY_NE_EVENT = "nova-era-certificacao-iso-replay";
const REPLAY_NE_TAG = "L2010_REPLAY_CADASTRO";
const REPLAY_NE_MATERIAL = "/assets/nova-era-iso/material-de-apoio-nova-era.html";
const ORBIT_MQL_STAGE_INCONSCIENTE = "68179273-9dc5-4daa-acca-b52e24f262ca";
const ORBIT_MQL_STAGE_CONSCIENTE_PROBLEMA = "122cd261-a6b9-42be-a498-655e4c6346c1";
const ORBIT_MQL_STAGE_DESCARTADO = "00f86530-e014-4a6f-8888-a075f733a295";
const WEBINAR_MQL_TAG_SERIE = "webinar 9001:2026";
const WEBINAR_MQL_SOURCE = "Webinar ISO 9001";

function mqlCampaignBySlug(slug) {
  return mqlCampaignsConfig.campaigns.find((c) => c.slug === slug);
}

/** LPs de segmento (evento "lead"): last-touch da página quando a URL não trouxe UTMs. */
const SEGMENT_LP_UTM_DEFAULTS = {
  "/iso-9001-advocacia-v2/": {
    utm_source: "site",
    utm_medium: "lp",
    utm_campaign: "iso-9001-advocacia-v2",
  },
};

function normLpPath(p) {
  const s = String(p || "").trim();
  if (!s) return "";
  return s.endsWith("/") ? s : s + "/";
}

/** LP de consultoria (-lp e -lp-v2): UTMs e clique só entram se vieram nesta URL. A página fica em lead.pagina. */
function applyConsultoriaLpCampaign(lead, body) {
  if (String(lead.evento || "") !== "lead") return;
  const path = normLpPath(pathOnly(lead.pagina)).toLowerCase();
  if (!/^\/consultoria\/[^/]+-lp(-v2)?\/$/.test(path)) return;
  const fromUrl = body && body.utm_from_url === true;
  const clickFromUrl = body && body.click_from_url === true;
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const v = fromUrl ? String(body[k] || "").trim() : "";
    lead[k] = v.slice(0, 180);
  }
  if (!clickFromUrl) {
    for (const k of ["gclid", "gbraid", "wbraid", "fbclid", "gad_source", "gad_campaignid", "msclkid", "ttclid"]) {
      lead[k] = "";
    }
  }
}

function applySegmentLpUtmDefaults(lead, body) {
  const d = SEGMENT_LP_UTM_DEFAULTS[normLpPath(lead.pagina)];
  if (!d || body?.utm_from_url === true) return lead;
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    if (d[k] != null && String(d[k]).trim() !== "") lead[k] = String(d[k]).trim();
  }
  return lead;
}

/** Na conversão na LP da campanha, last-touch = UTMs da campanha (não herda tpl_last de outro e-mail). */
function applyMqlLpAttribution(lead) {
  const c = mqlCampaignBySlug(lead.evento);
  if (!c?.lpPath || !c.utmDefaults) return lead;
  const norm = (p) => {
    const s = String(p || "").trim();
    if (!s) return "";
    return s.endsWith("/") ? s : s + "/";
  };
  if (norm(lead.pagina) !== norm(c.lpPath)) return lead;
  const d = c.utmDefaults;
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    if (d[k] != null && String(d[k]).trim() !== "") lead[k] = String(d[k]).trim();
  }
  return lead;
}

function nutricaoTagsForMqlCampaign(slug, channel) {
  const c = mqlCampaignBySlug(slug);
  if (!c) return [];
  const key = channel === "mailchimp" ? "mailchimpTags" : "manychatTags";
  if (Array.isArray(c[key]) && c[key].length) return c[key];
  return c.crmTags || [];
}

function buildOrbitMqlInscricao(campaigns) {
  const map = {};
  for (const c of campaigns) {
    const dest = c.crmDest === "lives"
      ? { pipelineId: ORBIT_LIVES_PIPELINE_ID, stageId: ORBIT_LIVES_STAGE_NOVO_INSCRITO }
      : { pipelineId: c.crmPipelineId || ORBIT_MQL_PIPELINE_ID, stageId: c.crmStageId || ORBIT_MQL_STAGE_NOVO };
    map[c.slug] = {
      tags: c.crmTags,
      source: c.crmSource,
      titleStyle: c.titleStyle || "empresa_suffix",
      dedupOpenMql: c.mqlDedupOpenLead !== false,
      pipelineId: dest.pipelineId,
      stageId: dest.stageId,
    };
    if (c.titleSuffix) map[c.slug].titleSuffix = c.titleSuffix;
    if (c.notes) map[c.slug].notes = c.notes;
    if (c.customFields) map[c.slug].customFields = true;
    const fx = c.fluxos;
    if (fx?.e0InboundPathKey) {
      map[c.slug].e0InboundPathKey = String(fx.e0InboundPathKey).trim();
      if (fx.e0SentTag) map[c.slug].e0SentTag = String(fx.e0SentTag).trim();
    }
    if (fx?.sdrInboundPathKey) {
      map[c.slug].sdrInboundPathKey = String(fx.sdrInboundPathKey).trim();
      if (fx.sdrSentTag) map[c.slug].sdrSentTag = String(fx.sdrSentTag).trim();
    }
  }
  return map;
}

const ORBIT_MQL_INSCRICAO = buildOrbitMqlInscricao(mqlCampaignsConfig.campaigns);
const MQL_CAMPAIGN_SLUG_SET = new Set(mqlCampaignsConfig.campaigns.map((c) => c.slug));
// Etiquetas do CRM por evento da LP (o POST /v1/leads grava `tags` direto no lead,
// então a etiqueta pode ser aplicada no momento da criação — sem chamada extra).
// Vazio por ora: o único evento mapeado aqui era o PE2027, que passou a ser
// tratado como inscrição de evento e não chega mais ao CRM (ver isInscricaoEvento).
const ORBIT_EVENTO_TAGS = {
  "curso-entendimento-iso-9001-2026": ["iso-9001-2026-curso"],
};
// Campos personalizados do CRM (field_key obtido em CRM → Campos Personalizados)
const ORBIT_FIELDS = {
  norma:        "cf_produto",
  cargo:        "cf_cargo_do_contato",
  funcionarios: "cf_faixa_de_funcion_rios",
  faturamento:  "cf_faixa_de_faturamento",
  desafio:      "cf_maior_desafio",
  pagina:       "cf_p_gina_de_convers_o",
  utm_source:   "cf_utm_source",
  utm_medium:   "cf_utm_medium",
  utm_campaign: "cf_utm_campaign",
  utm_term:     "cf_utm_term",
  utm_content:  "cf_utm_content",
};

async function saveToOrbit(lead, env, dest) {
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return { ok: false, reason: "not_configured" };

  const title = [lead.empresa || lead.nome || lead.email, lead.norma].filter(Boolean).join(" - ");

  const custom_fields = {};
  for (const [field, key] of Object.entries(ORBIT_FIELDS)) {
    const val = lead[field];
    if (val) custom_fields[key] = val;
  }

  const body = {
    title,
    pipeline_id: (dest && dest.pipeline_id) || ORBIT_PIPELINE_ID,
    stage_id: (dest && dest.stage_id) || ORBIT_STAGE_ID,
    contact_name: lead.nome || lead.email,
    contact_email: lead.email,
    source: "site",
  };
  if (lead.telefone) body.contact_phone = lead.telefone;
  if (lead.empresa) body.company_name = lead.empresa;
  const notes = [
    lead.mensagem,
    lead.desafio,
    lead.urgencia ? "Urgência: " + lead.urgencia : "",
    lead.pagina_submit && lead.pagina_submit !== lead.pagina
      ? "Formulário enviado em: " + lead.pagina_submit
      : "",
    lead.referrer ? "Referrer: " + lead.referrer : "",
  ].filter(Boolean).join("\n");
  const h1nota = notaH1(lead);
  const notasFinais = [notes, h1nota].filter(Boolean).join("\n");
  if (notasFinais) body.notes = notasFinais;
  if (Object.keys(custom_fields).length) body.custom_fields = custom_fields;

  // Etiqueta canônica do INBOUND é ISO9001 (junto). "ISO 9001" abria uma etiqueta nova.
  const orbitTags = withNormaTags(ORBIT_EVENTO_TAGS[lead.evento] || [], lead.pagina)
    .map((tag) => (tag === "ISO 9001" ? "ISO9001" : tag));
  if (orbitTags.length) body.tags = orbitTags;

  const headers = { "content-type": "application/json", authorization: "Bearer " + token };

  try {
    let r = await fetch(`${ORBIT_BASE}/leads`, {
      method: "POST", headers, body: JSON.stringify(body),
    }).catch(() => null);

    if (r && r.ok) {
      const d = await r.json().catch(() => ({}));
      return { ok: true, lead_id: d.data?.id };
    }

    // Fallback 1: cf_produto é o único campo que costuma ser recusado — é um SELECT
    // do CRM, e a LP pode mandar um valor que ainda não foi criado na lista de opções
    // (caso de "Templum OS" em 24/08/2026). Antes de desistir de TODOS os campos
    // personalizados, tenta de novo sem cf_produto e com todo o resto, para que UTM,
    // cargo e faixa de funcionários sobrevivam. Sem esta etapa, uma opção faltando na
    // lista do CRM cegava o rastreio da campanha inteira.
    if (body.custom_fields && body.custom_fields[ORBIT_FIELDS.norma]) {
      const cf = { ...body.custom_fields };
      delete cf[ORBIT_FIELDS.norma];
      if (Object.keys(cf).length) {
        r = await fetch(`${ORBIT_BASE}/leads`, {
          method: "POST", headers, body: JSON.stringify({ ...body, custom_fields: cf }),
        }).catch(() => null);
        if (r && r.ok) {
          const d = await r.json().catch(() => ({}));
          return { ok: true, lead_id: d.data?.id, produto_dropped: true };
        }
      }
    }

    // Fallback 2: outro custom field inválido — reenvia só rastreio (página + UTM).
    const basicBody = { ...body };
    const trackingKeys = [
      ORBIT_FIELDS.pagina,
      ORBIT_FIELDS.utm_source,
      ORBIT_FIELDS.utm_medium,
      ORBIT_FIELDS.utm_campaign,
      ORBIT_FIELDS.utm_term,
      ORBIT_FIELDS.utm_content,
    ];
    const trackingCf = {};
    if (body.custom_fields) {
      for (const k of trackingKeys) {
        if (body.custom_fields[k]) trackingCf[k] = body.custom_fields[k];
      }
    }
    if (Object.keys(trackingCf).length) basicBody.custom_fields = trackingCf;
    else delete basicBody.custom_fields;
    r = await fetch(`${ORBIT_BASE}/leads`, {
      method: "POST", headers, body: JSON.stringify(basicBody),
    }).catch(() => null);

    if (r && r.ok) {
      const d = await r.json().catch(() => ({}));
      return { ok: true, lead_id: d.data?.id, fields_dropped: true };
    }
    const e = r ? await r.text().catch(() => "") : "fetch_failed";
    return { ok: false, error: String(e).slice(0, 140) };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

function webinarMqlTags(evento) {
  const tags = [WEBINAR_MQL_TAG_SERIE];
  const ev = String(evento || "").trim();
  if (ev && ev.length <= 32 && ev !== WEBINAR_MQL_TAG_SERIE) tags.push(ev);
  return tags;
}

function webinarMqlNote(lead) {
  const evento = String(lead.evento || "");
  const pagina = String(lead.pagina || "");
  const utm = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(" / ");
  return [
    "Webinar ISO 9001: " + evento,
    pagina ? "Página: " + pagina : "",
    utm ? "UTM: " + utm : "",
  ].filter(Boolean).join("\n");
}

function webinarMqlCustomFields(lead) {
  const cf = {};
  if (lead.pagina) cf[ORBIT_FIELDS.pagina] = String(lead.pagina);
  if (lead.cargo) cf[ORBIT_FIELDS.cargo] = String(lead.cargo);
  if (lead.utm_source) cf[ORBIT_FIELDS.utm_source] = String(lead.utm_source);
  if (lead.utm_medium) cf[ORBIT_FIELDS.utm_medium] = String(lead.utm_medium);
  if (lead.utm_campaign) cf[ORBIT_FIELDS.utm_campaign] = String(lead.utm_campaign);
  if (lead.utm_term) cf[ORBIT_FIELDS.utm_term] = String(lead.utm_term);
  if (lead.utm_content) cf[ORBIT_FIELDS.utm_content] = String(lead.utm_content);
  return cf;
}

function mergeWebinarNotes(prev, incoming) {
  const p = String(prev || "").trim();
  const n = String(incoming || "").trim();
  if (!n) return p;
  if (!p) return n;
  if (p.indexOf(n) !== -1) return p;
  return p + "\n\n" + n;
}

async function persistWebinarMqlSync(env, row) {
  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey || !row.email) return;
  try {
    await fetch(`${sbUrl}/rest/v1/webinar_mql_sync`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + sbKey,
        apikey: sbKey,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        email: String(row.email).trim().toLowerCase(),
        orbit_lead_id: row.orbit_lead_id || null,
        action: row.action,
        pipeline_id: ORBIT_MQL_PIPELINE_ID,
        events: row.events || [],
        detail: row.detail || null,
        synced_at: new Date().toISOString(),
      }),
    });
  } catch (_) {
    /* auditoria; não bloqueia CRM */
  }
}

// Webinar ISO 9001 → funil MQL (não INBOUND). Regras em site/docs/campanhas-mql.md
async function saveToMqlWebinar(lead, env) {
  if (!String(lead.evento || "").startsWith("webinar")) {
    return { ok: true, skipped: true, reason: "not_webinar" };
  }
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return { ok: false, reason: "not_configured" };

  const email = String(lead.email || "").trim().toLowerCase();
  if (!email || email.indexOf("@") === -1) return { ok: false, error: "invalid_email" };

  const tags = withNormaTags(webinarMqlTags(lead.evento), lead.pagina);
  const note = webinarMqlNote(lead);
  const cf = webinarMqlCustomFields(lead);
  const headers = {
    "content-type": "application/json",
    authorization: "Bearer " + token,
    accept: "application/json",
  };

  try {
    const found = await crmFindLeadsForIsca(token, email, lead.telefone);
    const existingMql = pickOpenMqlLead(found);

    if (existingMql) {
      const patch = {
        tags: mergeLeadTags(existingMql.tags, tags),
        notes: mergeWebinarNotes(existingMql.notes || existingMql.note, note),
      };
      if (Object.keys(cf).length) patch.custom_fields = cf;
      const res = await fetch(`${ORBIT_BASE}/leads/${existingMql.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.text().catch(() => "");
        return { ok: false, error: String(e).slice(0, 140), lead_id: existingMql.id };
      }
      await persistWebinarMqlSync(env, {
        email,
        orbit_lead_id: existingMql.id,
        action: "tagged_mql",
        events: [String(lead.evento || "")],
        detail: "open_mql",
      });
      return { ok: true, action: "tagged_mql", orbit_lead_id: existingMql.id, pipeline_id: ORBIT_MQL_PIPELINE_ID };
    }

    const body = {
      title: String(lead.nome || lead.empresa || email),
      pipeline_id: ORBIT_MQL_PIPELINE_ID,
      stage_id: ORBIT_MQL_STAGE_NOVO,
      contact_name: String(lead.nome || email),
      contact_email: email,
      source: WEBINAR_MQL_SOURCE,
      tags,
      notes: note,
    };
    if (lead.telefone) body.contact_phone = lead.telefone;
    if (lead.empresa) body.company_name = lead.empresa;
    if (Object.keys(cf).length) body.custom_fields = cf;

    const r = await orbitPostLead(headers, body);
    if (!r || !r.ok) {
      const e = r ? await r.text().catch(() => "") : "fetch_failed";
      return { ok: false, error: String(e).slice(0, 140) };
    }
    const d = await r.json().catch(() => ({}));
    const orbit_lead_id = (d.data && d.data.id) || d.id || null;
    await persistWebinarMqlSync(env, {
      email,
      orbit_lead_id,
      action: "created",
      events: [String(lead.evento || "")],
    });
    return { ok: true, action: "created", orbit_lead_id, pipeline_id: ORBIT_MQL_PIPELINE_ID };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

function phoneDigits(raw) {
  return String(raw || "").replace(/\D/g, "").replace(/^55/, "").slice(-11);
}

function isOpenCrmLead(lead) {
  if (!lead || !lead.id) return false;
  if (lead.stage_id === ORBIT_MQL_STAGE_DESCARTADO) return false;
  const st = String(lead.status || lead.deal_status || "").toLowerCase();
  if (st === "lost" || st === "descartado") return false;
  return true;
}

function pickCrmLeadForIsca(leads) {
  const open = (leads || []).filter(isOpenCrmLead);
  const mql = open.filter((l) => l.pipeline_id === ORBIT_MQL_PIPELINE_ID);
  return mql[0] || open[0] || null;
}

/** Só card aberto no funil MQL (Intervalo / LSC One não reutilizam outros funis). */
function pickOpenMqlLead(leads) {
  return pickOpenLeadInPipeline(leads, ORBIT_MQL_PIPELINE_ID);
}

function pickOpenLeadInPipeline(leads, pipelineId) {
  return (leads || []).filter(isOpenCrmLead).find((l) => l.pipeline_id === pipelineId) || null;
}

async function crmSearchLeadsByTerm(token, term) {
  if (!term) return [];
  const r = await fetch(
    `${ORBIT_BASE}/leads/search?term=${encodeURIComponent(term)}&limit=50`,
    { headers: { authorization: "Bearer " + token, accept: "application/json" } },
  );
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({}));
  return j.data || j.leads || [];
}

async function crmFindLeadsForIsca(token, email, telefone) {
  const byEmail = email ? await crmSearchLeadsByEmail(token, email) : [];
  if (byEmail.length) return byEmail;
  const digits = phoneDigits(telefone);
  if (digits.length < 10) return [];
  const rows = await crmSearchLeadsByTerm(token, digits);
  return rows.filter((l) => phoneDigits(l.contact_phone) === digits || phoneDigits(l.phone) === digits);
}

async function orbitPostLead(headers, body) {
  let r = await fetch(`${ORBIT_BASE}/leads`, {
    method: "POST", headers, body: JSON.stringify(body),
  }).catch(() => null);
  if (r && r.ok) return r;
  if (body.custom_fields && body.custom_fields[ORBIT_FIELDS.norma]) {
    const cf = { ...body.custom_fields };
    delete cf[ORBIT_FIELDS.norma];
    if (Object.keys(cf).length) {
      r = await fetch(`${ORBIT_BASE}/leads`, {
        method: "POST", headers, body: JSON.stringify({ ...body, custom_fields: cf }),
      }).catch(() => null);
      if (r && r.ok) return r;
    }
  }
  const basicBody = { ...body };
  delete basicBody.custom_fields;
  return fetch(`${ORBIT_BASE}/leads`, {
    method: "POST", headers, body: JSON.stringify(basicBody),
  }).catch(() => null);
}

// Corte único: até R$ 100 mil (inclusive) vai ao MQL. A primeira faixa que
// passa de R$ 100 mil vai ao INBOUND. As duas listas cobrem o seletor da
// advocacia e o seletor da LP de consultoria.
const FATURAMENTO_SPLIT_LPS = {
  "/iso-9001-advocacia-v2/": {
    tag: "advocacia-ate-100mil",
    source: "LP Advocacia",
    note: "LP ISO 9001 advocacia.",
  },
  "/consultoria/iso-9001-lp-v2/": {
    tag: "iso9001-ate-100mil",
    source: "LP ISO 9001",
    note: "LP ISO 9001.",
  },
  "/consultoria/pbqp-h-lp-v2/": {
    tag: "pbqph-ate-100mil",
    source: "LP PBQP-H",
    note: "LP PBQP-H.",
  },
};
const FATURAMENTO_INBOUND = new Set([
  "De R$ 100 mil a R$ 500 mil",
  "De R$ 500 mil a R$ 1 milhão",
  "De R$ 1 milhão a R$ 5 milhões",
  "Acima de R$ 5 milhões",
  "R$ 100 mil a R$ 300 mil",
  "R$ 300 mil a R$ 500 mil",
  "R$ 500 mil a R$ 1 milhão",
  "Acima de R$ 1 milhão",
]);

function faturamentoSplitCfg(lead) {
  const path = normLpPath(pathOnly(lead && lead.pagina)).toLowerCase();
  return FATURAMENTO_SPLIT_LPS[path] || null;
}

function isFaturamentoInbound(lead) {
  if (!faturamentoSplitCfg(lead)) return false;
  return FATURAMENTO_INBOUND.has(String(lead.faturamento || "").trim());
}

function isFaturamentoMql(lead) {
  return Boolean(faturamentoSplitCfg(lead)) && !isFaturamentoInbound(lead);
}

function faturamentoMqlTags(lead) {
  const cfg = faturamentoSplitCfg(lead);
  return withNormaTags([cfg && cfg.tag], lead.pagina).map((tag) =>
    tag === "ISO 9001" ? "ISO9001" : tag,
  );
}

function faturamentoMqlNote(lead) {
  const cfg = faturamentoSplitCfg(lead);
  const faixa = String(lead.faturamento || "").trim();
  const lines = [cfg ? cfg.note : "LP com corte de faturamento."];
  lines.push(faixa ? "Faturamento mensal: " + faixa + "." : "Faturamento mensal não informado.");
  if (lead.pagina) lines.push(String(lead.pagina));
  return lines.join("\n");
}

function faturamentoMqlCustomFields(lead) {
  const custom_fields = {};
  for (const [field, key] of Object.entries(ORBIT_FIELDS)) {
    const val = lead[field];
    if (val) custom_fields[key] = val;
  }
  return custom_fields;
}

// Faixa até R$ 100 mil → funil MQL (não INBOUND). Dedup só no MQL.
async function saveToMqlPorFaturamento(lead, env) {
  if (!isFaturamentoMql(lead)) return { ok: true, skipped: true, reason: "not_faturamento_mql" };
  const cfg = faturamentoSplitCfg(lead);
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return { ok: false, reason: "not_configured" };

  const email = String(lead.email || "").trim().toLowerCase();
  if (!email || email.indexOf("@") === -1) return { ok: false, error: "invalid_email" };

  const tags = faturamentoMqlTags(lead);
  const note = faturamentoMqlNote(lead);
  const custom_fields = faturamentoMqlCustomFields(lead);
  const headers = {
    "content-type": "application/json",
    authorization: "Bearer " + token,
    accept: "application/json",
  };

  try {
    const found = await crmFindLeadsForIsca(token, email, lead.telefone);
    const existingMql = pickOpenMqlLead(found);

    if (existingMql) {
      const patch = { tags: mergeLeadTags(existingMql.tags, tags) };
      const prev = String(existingMql.notes || existingMql.note || "").trim();
      patch.notes = prev && prev.indexOf(note) === -1 ? prev + "\n\n" + note : prev || note;
      if (Object.keys(custom_fields).length) patch.custom_fields = custom_fields;
      const res = await fetch(`${ORBIT_BASE}/leads/${existingMql.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.text().catch(() => "");
        return { ok: false, error: String(e).slice(0, 140), lead_id: existingMql.id };
      }
      return { ok: true, action: "tagged_mql", lead_id: existingMql.id, pipeline_id: ORBIT_MQL_PIPELINE_ID };
    }

    const body = {
      title: String(lead.empresa || lead.nome || email),
      pipeline_id: ORBIT_MQL_PIPELINE_ID,
      stage_id: ORBIT_MQL_STAGE_NOVO,
      contact_name: String(lead.nome || email),
      contact_email: email,
      source: cfg.source,
      tags,
      notes: note,
    };
    if (lead.telefone) body.contact_phone = lead.telefone;
    if (lead.empresa) body.company_name = lead.empresa;
    if (Object.keys(custom_fields).length) body.custom_fields = custom_fields;

    const r = await orbitPostLead(headers, body);
    if (!r || !r.ok) {
      const e = r ? await r.text().catch(() => "") : "fetch_failed";
      return { ok: false, error: String(e).slice(0, 140) };
    }
    const d = await r.json().catch(() => ({}));
    return {
      ok: true,
      action: "created",
      lead_id: (d.data && d.data.id) || d.id || null,
      pipeline_id: ORBIT_MQL_PIPELINE_ID,
    };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// Isca digital → funil MQL (não INBOUND). Dedup só no MQL; outros funis abertos não recebem tag.
async function saveToMqlIsca(lead, env) {
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return { ok: false, reason: "not_configured" };

  const tags = iscaOrbitTags(lead);
  const note = lead.mensagem || "";
  const isResultado = lead.evento === "isca-resultado";
  const headers = { "content-type": "application/json", authorization: "Bearer " + token, accept: "application/json" };

  try {
    const found = await crmFindLeadsForIsca(token, lead.email, lead.telefone);
    const existingMql = pickOpenMqlLead(found);

    if (existingMql) {
      const patch = { tags: mergeLeadTags(existingMql.tags, tags) };
      if (note) {
        const prev = String(existingMql.notes || existingMql.note || "").trim();
        patch.notes = prev && prev.indexOf(note) === -1 ? prev + "\n\n" + note : (prev || note);
      }
      const canAdvance =
        isResultado &&
        (existingMql.stage_id === ORBIT_MQL_STAGE_NOVO ||
          existingMql.stage_id === ORBIT_MQL_STAGE_INCONSCIENTE);
      if (canAdvance) patch.stage_id = ORBIT_MQL_STAGE_CONSCIENTE_PROBLEMA;

      const res = await fetch(`${ORBIT_BASE}/leads/${existingMql.id}`, {
        method: "PATCH", headers, body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const e = await res.text().catch(() => "");
        return { ok: false, error: e.slice(0, 140), lead_id: existingMql.id };
      }
      return { ok: true, lead_id: existingMql.id, updated: true, advanced: !!canAdvance };
    }

    const title = [lead.empresa || lead.nome || lead.email, lead.norma || "Isca"].filter(Boolean).join(" - ");
    const custom_fields = {};
    for (const [field, key] of Object.entries(ORBIT_FIELDS)) {
      const val = lead[field];
      if (val) custom_fields[key] = val;
    }
    const body = {
      title,
      pipeline_id: ORBIT_MQL_PIPELINE_ID,
      stage_id: isResultado ? ORBIT_MQL_STAGE_CONSCIENTE_PROBLEMA : ORBIT_MQL_STAGE_NOVO,
      contact_name: lead.nome || lead.email,
      contact_email: lead.email,
      source: "Isca digital",
      tags,
    };
    if (lead.telefone) body.contact_phone = lead.telefone;
    if (lead.empresa) body.company_name = lead.empresa;
    if (note) body.notes = note;
    if (Object.keys(custom_fields).length) body.custom_fields = custom_fields;

    const r = await orbitPostLead(headers, body);
    if (r && r.ok) {
      const d = await r.json().catch(() => ({}));
      return { ok: true, lead_id: d.data?.id, created: true };
    }
    const e = r ? await r.text().catch(() => "") : "fetch_failed";
    return { ok: false, error: String(e).slice(0, 140) };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

function mqlInscricaoTitle(lead, cfg) {
  if (cfg.titleStyle === "contact") return (lead.nome || lead.email || "").trim();
  const suffix = cfg.titleSuffix || "Inscrição";
  return [lead.empresa || lead.nome || lead.email, suffix].filter(Boolean).join(" - ");
}

function mqlInscricaoCustomFields(lead) {
  const custom_fields = {};
  for (const [field, key] of Object.entries(ORBIT_FIELDS)) {
    const val = lead[field];
    if (val) custom_fields[key] = val;
  }
  return custom_fields;
}

function buildMqlInscricaoPatch(lead, cfg, existingMql, tags) {
  const patch = { tags: mergeLeadTags(existingMql.tags, tags) };
  patch.title = mqlInscricaoTitle(lead, cfg);
  if (lead.nome) patch.contact_name = lead.nome;
  if (lead.telefone) patch.contact_phone = lead.telefone;
  if (lead.empresa) patch.company_name = lead.empresa;
  if (cfg.source) patch.source = cfg.source;
  if (cfg.notes) {
    const prev = String(existingMql.notes || existingMql.note || "").trim();
    patch.notes =
      prev && prev.indexOf(cfg.notes) === -1 ? prev + "\n\n" + cfg.notes : prev || cfg.notes;
  }
  if (cfg.customFields) {
    const cf = mqlInscricaoCustomFields(lead);
    if (Object.keys(cf).length) patch.custom_fields = cf;
  }
  return patch;
}

function leadHasCrmTag(lead, tag) {
  const want = String(tag || "").trim().toLowerCase();
  if (!want) return false;
  return (lead?.tags || []).some((t) => String(t).trim().toLowerCase() === want);
}

function mqlE0WebhookSecret(pathKey, env) {
  const raw = env.MQL_E0_WEBHOOK_SECRETS;
  if (raw) {
    try {
      const map = typeof raw === "string" ? JSON.parse(raw) : raw;
      if (map && map[pathKey]) return String(map[pathKey]);
    } catch (_) {
      /* fallback below */
    }
  }
  const gfPaths = new Set([
    "intervalo-tecnico-gestao-financeira-e0",
    "wh_1a3cf478c5404112",
    "wh_d916fe011ef64d41",
  ]);
  if (gfPaths.has(pathKey) && env.INTERVALO_E0_FLUXOS_SECRET) {
    return env.INTERVALO_E0_FLUXOS_SECRET;
  }
  const nePaths = new Set(["nova-era-certificacao-iso-e0"]);
  if (nePaths.has(pathKey) && env.NOVA_ERA_E0_FLUXOS_SECRET) {
    return env.NOVA_ERA_E0_FLUXOS_SECRET;
  }
  return "";
}

async function triggerMqlCampaignSdrWebhook(cfg, leadRecord, leadId, env) {
  const pathKey = cfg && cfg.sdrInboundPathKey;
  if (!pathKey || !leadId) return { ok: false, reason: "not_configured" };
  if (cfg.sdrSentTag && leadRecord && leadHasCrmTag(leadRecord, cfg.sdrSentTag)) {
    return { ok: false, reason: "sdr_already_sent" };
  }
  const secret = env.INTERVALO_SDR_FLUXOS_SECRET || "";
  if (!secret) return { ok: false, reason: "not_configured" };
  const url = `${FLUXOS_WEBHOOK_INBOUND_BASE}/${encodeURIComponent(pathKey)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Fluxos-Secret": secret,
      },
      body: JSON.stringify({ lead_id: leadId }),
    });
    const e = await res.text().catch(() => "");
    let parsed = null;
    try { parsed = JSON.parse(e); } catch (_) { parsed = null; }
    if (!res.ok || (parsed && parsed.success === false)) {
      return { ok: false, status: res.status, error: String(e).slice(0, 200) };
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, error: "fetch_failed" };
  }
}

async function triggerMqlCampaignE0Webhook(pathKey, leadId, env, dest) {
  const secret = mqlE0WebhookSecret(pathKey, env);
  if (!secret || !leadId || !pathKey) return { ok: false, reason: "not_configured" };
  const url = `${FLUXOS_WEBHOOK_INBOUND_BASE}/${encodeURIComponent(pathKey)}`;
  const payload = { lead_id: leadId };
  if (dest?.pipelineId) payload.pipeline_id = dest.pipelineId;
  if (dest?.stageId) payload.stage_id = dest.stageId;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "X-Fluxos-Secret": secret,
      },
      body: JSON.stringify(payload),
    });
    const e = await res.text().catch(() => "");
    let parsed = null;
    try { parsed = JSON.parse(e); } catch (_) { parsed = null; }
    if (!res.ok || (parsed && parsed.success === false)) {
      return { ok: false, status: res.status, error: String(e).slice(0, 200) };
    }
    return { ok: true };
  } catch (_) {
    return { ok: false, error: "fetch_failed" };
  }
}

async function keepZoomFieldsOnPatch(headers, leadId, patch) {
  const get = await fetch(`${ORBIT_BASE}/leads/${leadId}`, { headers }).catch(() => null);
  if (!get || !get.ok) return patch;
  const payload = await get.json().catch(() => ({}));
  const card = payload.data || payload.lead || payload;
  const prev = card.custom_fields && typeof card.custom_fields === "object" ? card.custom_fields : {};
  const keep = {};
  if (prev[ZOOM_SHORT_FIELD]) keep[ZOOM_SHORT_FIELD] = prev[ZOOM_SHORT_FIELD];
  if (prev[ZOOM_JOIN_FIELD]) keep[ZOOM_JOIN_FIELD] = prev[ZOOM_JOIN_FIELD];
  if (!Object.keys(keep).length) return patch;
  return { ...patch, custom_fields: { ...keep, ...(patch.custom_fields || {}) } };
}

// 20/10/2026 18:00 em Brasília. Depois disso a sala desta live não recebe inscrição nova.
const ZOOM_LIVE_REGISTER_UNTIL_MS = Date.parse("2026-10-20T21:00:00.000Z");

function zoomSignupEmail(email) {
  const value = String(email || "").trim().toLowerCase();
  const at = value.indexOf("@");
  if (at < 1) return "";
  if (!value.slice(at + 1).includes(".")) return "";
  return value;
}

// Funil LIVES: inscreve no Zoom e grava o link curto. Falha aqui não desfaz o card.
async function attachZoomLiveRegistrant(env, headers, leadId, lead) {
  if (!leadId) return { ok: false, reason: "no_lead" };
  if (Date.now() >= ZOOM_LIVE_REGISTER_UNTIL_MS) return { ok: false, reason: "after_live" };
  const email = zoomSignupEmail(lead && lead.email);
  if (!email) return { ok: false, reason: "invalid_email" };
  if (!env.ZOOM_ACCOUNT_ID || !env.ZOOM_CLIENT_ID || !env.ZOOM_CLIENT_SECRET) {
    return { ok: false, reason: "not_configured" };
  }
  try {
    const get = await fetch(`${ORBIT_BASE}/leads/${leadId}`, { headers });
    if (!get.ok) return { ok: false, reason: "lead_not_found" };
    const payload = await get.json().catch(() => ({}));
    const card = payload.data || payload.lead || payload;
    const prev = card.custom_fields && typeof card.custom_fields === "object" ? card.custom_fields : {};
    if (prev[ZOOM_SHORT_FIELD] && prev[ZOOM_JOIN_FIELD]) return { ok: true, skipped: "already_linked" };

    const token = await zoomAccessToken({
      accountId: env.ZOOM_ACCOUNT_ID,
      clientId: env.ZOOM_CLIENT_ID,
      clientSecret: env.ZOOM_CLIENT_SECRET,
    });
    const name = splitZoomName((lead && lead.nome) || card.contact_name || email);
    const joinUrl = await addMeetingRegistrant({
      token,
      meetingId: env.ZOOM_MEETING_ID || ZOOM_MEETING_ID,
      email,
      firstName: name.first_name,
      lastName: name.last_name,
    });
    const res = await fetch(`${ORBIT_BASE}/leads/${leadId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ custom_fields: { ...prev, ...zoomLinkFields(leadId, joinUrl) } }),
    });
    if (!res.ok) return { ok: false, reason: "crm_patch" };
    return { ok: true };
  } catch (err) {
    const code = err && err.body && err.body.code;
    console.error("[lead:zoom]", JSON.stringify({ lead_id: leadId, status: err && err.status || 0, code: code || null }));
    return { ok: false, reason: "zoom", code: code || null };
  }
}

// Inscrição de LP/campanha (ORBIT_MQL_INSCRICAO) → funil da campanha (padrão: MQL / Novo Lead).
// Nova Era (crmDest: lives) grava em LIVES / Novo inscrito. E0: ver fluxos.e0InboundPathKey.
async function saveToMqlInscricao(lead, env) {
  const cfg = ORBIT_MQL_INSCRICAO[lead.evento];
  if (!cfg) return { ok: false, reason: "unknown_event" };

  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return { ok: false, reason: "not_configured" };

  const tags = withNormaTags(cfg.tags, lead.pagina);
  const headers = { "content-type": "application/json", authorization: "Bearer " + token, accept: "application/json" };
  const destPipelineId = cfg.pipelineId || ORBIT_MQL_PIPELINE_ID;
  const destStageId = cfg.stageId || ORBIT_MQL_STAGE_NOVO;

  try {
    if (cfg.dedupOpenMql) {
      const found = await crmFindLeadsForIsca(token, lead.email, lead.telefone);
      const existingDest = pickOpenLeadInPipeline(found, destPipelineId);
      if (existingDest) {
        let patch = buildMqlInscricaoPatch(lead, cfg, existingDest, tags);
        if (destPipelineId === ORBIT_LIVES_PIPELINE_ID) {
          patch = await keepZoomFieldsOnPatch(headers, existingDest.id, patch);
        }
        const res = await fetch(`${ORBIT_BASE}/leads/${existingDest.id}`, {
          method: "PATCH", headers, body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const e = await res.text().catch(() => "");
          return { ok: false, error: e.slice(0, 140), lead_id: existingDest.id };
        }
        let fluxo_e0;
        if (cfg.e0InboundPathKey) {
          if (cfg.e0SentTag && leadHasCrmTag(existingDest, cfg.e0SentTag)) {
            fluxo_e0 = { ok: false, reason: "e0_already_sent" };
          } else {
            fluxo_e0 = await triggerMqlCampaignE0Webhook(cfg.e0InboundPathKey, existingDest.id, env, {
              pipelineId: destPipelineId,
              stageId: destStageId,
            });
            if (fluxo_e0 && fluxo_e0.ok === false) {
              console.error("[lead:mql:e0]", JSON.stringify({ lead_id: existingDest.id, fluxo_e0 }));
            }
          }
        }
        let fluxo_sdr;
        if (cfg.sdrInboundPathKey) {
          fluxo_sdr = await triggerMqlCampaignSdrWebhook(cfg, existingDest, existingDest.id, env);
          if (fluxo_sdr && fluxo_sdr.ok === false && fluxo_sdr.reason !== "sdr_already_sent") {
            console.error("[lead:mql:sdr]", JSON.stringify({ lead_id: existingDest.id, fluxo_sdr }));
          }
        }
        let zoom;
        if (destPipelineId === ORBIT_LIVES_PIPELINE_ID) {
          zoom = await attachZoomLiveRegistrant(env, headers, existingDest.id, lead);
        }
        return { ok: true, lead_id: existingDest.id, updated: true, fluxo_e0, fluxo_sdr, zoom };
      }
    }

    const body = {
      title: mqlInscricaoTitle(lead, cfg),
      pipeline_id: destPipelineId,
      stage_id: destStageId,
      contact_name: lead.nome || lead.email,
      contact_email: lead.email,
      source: cfg.source,
      tags,
    };
    if (cfg.notes) body.notes = cfg.notes;
    if (lead.telefone) body.contact_phone = lead.telefone;
    if (lead.empresa) body.company_name = lead.empresa;
    if (cfg.customFields) {
      const custom_fields = mqlInscricaoCustomFields(lead);
      if (Object.keys(custom_fields).length) body.custom_fields = custom_fields;
    }

    const r = await orbitPostLead(headers, body);
    if (r && r.ok) {
      const d = await r.json().catch(() => ({}));
      const created = d.data || d.lead || d;
      const leadId = created?.id || d.id || null;
      let fluxo_e0;
      if (!leadId) {
        console.error("[lead:mql] crm sem id", JSON.stringify(Object.keys(d || {})));
      } else if (cfg.e0InboundPathKey) {
        fluxo_e0 = await triggerMqlCampaignE0Webhook(cfg.e0InboundPathKey, leadId, env, {
          pipelineId: destPipelineId,
          stageId: destStageId,
        });
        if (fluxo_e0 && fluxo_e0.ok === false) {
          console.error("[lead:mql:e0]", JSON.stringify({ lead_id: leadId, fluxo_e0 }));
        }
      }
      let fluxo_sdr;
      if (cfg.sdrInboundPathKey && leadId) {
        fluxo_sdr = await triggerMqlCampaignSdrWebhook(cfg, null, leadId, env);
        if (fluxo_sdr && fluxo_sdr.ok === false && fluxo_sdr.reason !== "sdr_already_sent") {
          console.error("[lead:mql:sdr]", JSON.stringify({ lead_id: leadId, fluxo_sdr }));
        }
      }
      let zoom;
      if (leadId && destPipelineId === ORBIT_LIVES_PIPELINE_ID) {
        zoom = await attachZoomLiveRegistrant(env, headers, leadId, lead);
      }
      return { ok: true, lead_id: leadId, created: true, fluxo_e0, fluxo_sdr, zoom };
    }
    const e = r ? await r.text().catch(() => "") : "fetch_failed";
    return { ok: false, error: String(e).slice(0, 140) };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// Replay da Nova Era: etiqueta o card aberto do LIVES e não muda a fase.
// Card novo entra em Novo inscrito só com L2010_REPLAY_CADASTRO, sem a etiqueta
// "nova era da iso", para não disparar o A0 nem o e-mail da live.
function tagsKeepingReplay(existing) {
  const tags = mergeLeadTags(existing, [REPLAY_NE_TAG]);
  if (tags.includes(REPLAY_NE_TAG)) return tags;
  const rest = tags.filter((t) => t !== REPLAY_NE_TAG);
  if (rest.length >= 20) rest.pop();
  return [REPLAY_NE_TAG, ...rest].slice(0, 20);
}

async function saveReplayCadastro(lead, env) {
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return { ok: false, reason: "not_configured" };

  const headers = { "content-type": "application/json", authorization: "Bearer " + token, accept: "application/json" };
  try {
    const found = await crmFindLeadsForIsca(token, lead.email, lead.telefone);
    const existing = pickOpenLeadInPipeline(found, ORBIT_LIVES_PIPELINE_ID);
    if (existing) {
      const res = await fetch(`${ORBIT_BASE}/leads/${existing.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ tags: tagsKeepingReplay(existing.tags) }),
      });
      if (!res.ok) {
        const e = await res.text().catch(() => "");
        return { ok: false, error: e.slice(0, 140), lead_id: existing.id };
      }
      return { ok: true, lead_id: existing.id, updated: true };
    }

    const body = {
      title: (lead.nome || lead.email || "").trim(),
      pipeline_id: ORBIT_LIVES_PIPELINE_ID,
      stage_id: ORBIT_LIVES_STAGE_NOVO_INSCRITO,
      contact_name: lead.nome || lead.email,
      contact_email: lead.email,
      source: "Replay Nova Era",
      tags: [REPLAY_NE_TAG],
    };
    if (lead.telefone) body.contact_phone = lead.telefone;
    if (lead.empresa) body.company_name = lead.empresa;
    const r = await orbitPostLead(headers, body);
    if (r && r.ok) {
      const d = await r.json().catch(() => ({}));
      const created = d.data || d.lead || d;
      return { ok: true, lead_id: created?.id || d.id || null, created: true };
    }
    const e = r ? await r.text().catch(() => "") : "fetch_failed";
    return { ok: false, error: String(e).slice(0, 140) };
  } catch (_) {
    return { ok: false, error: "fetch_failed" };
  }
}

async function handleWebinarMqlBackfill(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (token !== expected) return json({ ok: false, error: "unauthorized" }, 401);

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey) return json({ ok: false, error: "not_configured" }, 500);

  const limit = Math.max(1, Math.min(parseInt(url.searchParams.get("limit") || "25", 10) || 25, 80));
  try {
    const r = await fetch(`${sbUrl}/functions/v1/upsert-webinar-mql`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer " + sbKey,
        apikey: sbKey,
      },
      body: JSON.stringify({ mode: "backfill", limit }),
    });
    const d = await r.json().catch(() => ({}));
    return json(d, r.ok ? 200 : 500);
  } catch (e) {
    return json({ ok: false, error: "fetch_failed" }, 500);
  }
}

// ---- 4) ManyChat ---------------------------------------------------------
// Cria/atualiza o subscriber do WhatsApp no ManyChat e aplica etiquetas por
// produto (norma) e por série de webinar. Reaproveita os custom fields que já
// existem na conta (Settings → Custom Fields) em vez de criar campos novos.
const MC_BASE = "https://api.manychat.com";

// Mapa norma → etiqueta de produto (etiquetas já criadas no ManyChat).
const MC_NORMA_TAGS = {
  "ISO 9001": "lp9001",
  "ISO 14001": "lp14001",
  "ISO 27001": "lp27001",
  "ISO 45001": "lp45001",
  "ISO 37001": "lp37001",
  "PBQP-H": "lppbqph",
  "FSSC 22000": "lpfssc22000",
  "HACCP": "lphaccp",
  "ESG": "lpesg",
  "SGI": "lpsgi",
  "SASSMAQ": "lpsassmaq",
  "LGPD": "lplgpd",
};

const BR_DDD = new Set(["11","12","13","14","15","16","17","18","19","21","22","24","27","28","31","32","33","34","35","37","38","41","42","43","44","45","46","47","48","49","51","53","54","55","61","62","63","64","65","66","67","68","69","71","73","74","75","77","79","81","82","83","84","85","86","87","88","89","91","92","93","94","95","96","97","98","99"]);

function brMobileDigits(raw) {
  let d = String(raw || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length > 11) d = d.slice(0, 11);
  return d;
}

function isBrWhatsappMobile(d) {
  return d.length === 11 && d.charAt(2) === "9" && BR_DDD.has(d.slice(0, 2));
}

function formatBrWhatsappMask(d) {
  return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
}

// Converte telefone BR em qualquer formato p/ E.164 (+55...) — exigido pelo whatsapp_phone.
function toE164BR(raw) {
  const d = brMobileDigits(raw);
  if (!d) return "";
  return "+55" + d;
}

function manyChatTagsFor(lead) {
  const tags = [];
  if (lead.evento.startsWith("webinar") || lead.evento.startsWith("webserie")) tags.push("webserie_ISO9001");
  // Workshop de Planejamento Estratégico 2027: até aqui esse público entrava no
  // ManyChat sem etiqueta nenhuma (não é webinar nem webserie, e a LP não manda
  // norma), então não havia como disparar lembrete do evento por lá.
  if (lead.evento === "planejamento-estrategico-2027") tags.push("PE2027");
  tags.push(...nutricaoTagsForMqlCampaign(lead.evento, "manychat"));
  if (lead.evento === "isca" || lead.evento === "isca-resultado") tags.push("isca");
  const produto = MC_NORMA_TAGS[lead.norma];
  if (produto) tags.push(produto);
  return tags;
}

function manyChatFieldsFor(lead) {
  return [
    ["cargo", lead.cargo],
    ["Empresa", lead.empresa],
    ["n_funcionarios", lead.funcionarios],
    ["faturamento_mensal", lead.faturamento],
    ["necessidade", lead.mensagem || lead.desafio],
    ["produto", lead.norma],
    ["Urgência", lead.urgencia],
    ["url_cadastro", lead.pagina],
    ["utm_source", lead.utm_source],
    ["utm_campaign", lead.utm_campaign],
    ["utm_term", lead.utm_term],
    ["CF_email", lead.email],
  ].filter(([, value]) => value);
}

async function findManyChatSubscriberByPhone(phone, headers) {
  const r = await fetch(`${MC_BASE}/fb/subscriber/findBySystemField?phone=${encodeURIComponent(phone)}`, { headers }).catch(() => null);
  if (!r || !r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.data && !Array.isArray(d.data) && d.data.id ? d.data.id : null;
}

async function saveToManyChat(lead, env) {
  const token = env.MANYCHAT_API_KEY;
  if (!token) return { ok: false, reason: "not_configured" };

  const phone = toE164BR(lead.telefone);
  if (!phone) return { ok: false, reason: "no_phone" };

  const headers = { "content-type": "application/json", authorization: "Bearer " + token };

  try {
    let subscriberId = await findManyChatSubscriberByPhone(phone, headers);

    if (!subscriberId) {
      const rc = await fetch(`${MC_BASE}/fb/subscriber/createSubscriber`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          whatsapp_phone: phone,
          first_name: lead.nome || lead.email,
          consent_phrase: "Lead aceitou receber mensagens no WhatsApp da Templum ao preencher formulário em templum.com.br",
        }),
      }).catch(() => null);

      if (rc && rc.ok) {
        const d = await rc.json().catch(() => ({}));
        subscriberId = d.data?.id || null;
      } else {
        // Já existe (corrida entre requests, ou telefone já cadastrado por outro canal) → busca de novo.
        subscriberId = await findManyChatSubscriberByPhone(phone, headers);
      }
    }

    if (!subscriberId) return { ok: false, error: "no_subscriber_id" };

    const fields = manyChatFieldsFor(lead);
    const tags = manyChatTagsFor(lead);

    await Promise.all([
      ...fields.map(([field_name, field_value]) =>
        fetch(`${MC_BASE}/fb/subscriber/setCustomFieldByName`, {
          method: "POST",
          headers,
          body: JSON.stringify({ subscriber_id: subscriberId, field_name, field_value }),
        }).catch(() => null)
      ),
      ...tags.map((tag_name) =>
        fetch(`${MC_BASE}/fb/subscriber/addTagByName`, {
          method: "POST",
          headers,
          body: JSON.stringify({ subscriber_id: subscriberId, tag_name }),
        }).catch(() => null)
      ),
    ]);

    return { ok: true, subscriber_id: subscriberId };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// ---- 5) Meta CAPI — evento Lead server-side --------------------------------
async function sendMetaLead(lead, env, request) {
  const accounts = [
    { pixel: env.META_PIXEL_ID, token: env.META_CAPI_TOKEN, test: env.META_TEST_EVENT_CODE },
    { pixel: env.META_PIXEL_ID_2, token: env.META_CAPI_TOKEN_2, test: env.META_TEST_EVENT_CODE_2 },
  ].filter((a) => a.pixel && a.token);
  if (!accounts.length) return;

  const phoneDigits = lead.telefone ? String(lead.telefone).replace(/\D/g, "") : "";
  const nameParts = lead.nome.trim().split(" ");
  const user_data = {};
  const em = await sha256(lead.email);
  const ph = phoneDigits ? await sha256(phoneDigits) : undefined;
  const fn = await sha256(nameParts[0] || "");
  const ln = nameParts.length > 1 ? await sha256(nameParts.slice(1).join(" ")) : undefined;
  if (em) user_data.em = [em];
  if (ph) user_data.ph = [ph];
  if (fn) user_data.fn = [fn];
  if (ln) user_data.ln = [ln];
  if (lead.fbp) user_data.fbp = lead.fbp;
  if (lead.fbc) user_data.fbc = lead.fbc;
  user_data.client_ip_address = request.headers.get("cf-connecting-ip") || "";
  user_data.client_user_agent = request.headers.get("user-agent") || "";

  // content_name idêntico ao do pixel do navegador (último segmento da rota,
  // sem sufixo "-lp") — é por esse parâmetro que o gestor de tráfego filtra
  // conversão personalizada por LP.
  const slug = (lead.meta_content_name || "").trim() ||
    (lead.pagina || "").split("/").filter(Boolean).pop()?.replace(/-lp$/, "") || "home";

  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    // Mesmo id do fbq eventID (meta_event_id) → Meta deduplica navegador + CAPI.
    event_id: lead.meta_event_id || `lead-${lead.email}-${Date.now()}`,
    action_source: "website",
    event_source_url: lead.pagina ? `https://templum.com.br${lead.pagina}` : "https://templum.com.br",
    user_data,
    custom_data: {
      content_name: slug,
      norma: lead.norma || "",
      evento: lead.evento || "",
    },
  };

  const events = [event];

  // Espelho server-side do trackCustom do navegador. O event_id leva o sufixo
  // "-q" — mesmo id que a LP usa no fbq — para o Meta deduplicar os dois.
  if (slug === LP_QUALIFICADO && FATURAMENTO_QUALIFICADO.includes(lead.faturamento)) {
    events.push({
      ...event,
      event_name: EVENTO_QUALIFICADO,
      event_id: `${lead.meta_event_id || `lead-${lead.email}-${Date.now()}`}-q`,
      custom_data: {
        content_name: "Diagnóstico de Gestão",
        faturamento: lead.faturamento,
        funcionarios: lead.funcionarios || "",
        cargo: lead.cargo || "",
      },
    });
  }

  await Promise.all(accounts.map(async (a) => {
    const body = { data: events };
    if (a.test) body.test_event_code = a.test;
    await fetch(
      `https://graph.facebook.com/${META_API_VERSION}/${a.pixel}/events?access_token=${encodeURIComponent(a.token)}`,
      { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }
    );
  }));
}

// ---------------------- Meta Conversions API ----------------------
async function handleTrack(request, env) {
  let p = {};
  try { p = await request.json(); } catch (_) { return json({ ok: false, error: "invalid_json" }, 400); }

  // Suporta até 2 contas Meta (rodando em paralelo).
  const accounts = [
    { pixel: env.META_PIXEL_ID, token: env.META_CAPI_TOKEN, test: env.META_TEST_EVENT_CODE },
    { pixel: env.META_PIXEL_ID_2, token: env.META_CAPI_TOKEN_2, test: env.META_TEST_EVENT_CODE_2 },
  ].filter((a) => a.pixel && a.token);
  // Sem nenhuma conta configurada, não envia (mantém a UX; o pixel do navegador segue).
  if (!accounts.length) return json({ ok: true, configured: false });

  // user_data hasheado (Meta exige SHA-256 em em/ph/fn/ln).
  const phoneDigits = p.phone ? String(p.phone).replace(/\D/g, "") : "";
  const user_data = {};
  const em = await sha256(p.email);
  const ph = phoneDigits ? await sha256(phoneDigits) : undefined;
  const fn = await sha256(p.first_name);
  const ln = await sha256(p.last_name);
  if (em) user_data.em = [em];
  if (ph) user_data.ph = [ph];
  if (fn) user_data.fn = [fn];
  if (ln) user_data.ln = [ln];
  if (p.external_id) user_data.external_id = [p.external_id];
  if (p.fbp) user_data.fbp = p.fbp;
  if (p.fbc) user_data.fbc = p.fbc;
  user_data.client_ip_address = request.headers.get("cf-connecting-ip") || p.ip_address || "";
  user_data.client_user_agent = request.headers.get("user-agent") || "";

  const event = {
    event_name: p.event_name || "Lead",
    event_time: p.event_time || Math.floor(Date.now() / 1000),
    event_id: p.event_id,
    action_source: "website",
    event_source_url: p.page_url || "",
    user_data,
    custom_data: p.properties || {},
  };

  // Envia o mesmo evento (mesmo event_id → dedup com o pixel do navegador) para cada conta.
  const results = await Promise.all(accounts.map(async (a) => {
    const capiBody = { data: [event] };
    if (a.test) capiBody.test_event_code = a.test;
    try {
      const resp = await fetch(
        `https://graph.facebook.com/${META_API_VERSION}/${a.pixel}/events?access_token=${encodeURIComponent(a.token)}`,
        { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(capiBody) }
      );
      if (resp.ok) return { pixel: a.pixel, ok: true };
      const err = await resp.json().catch(() => ({}));
      return { pixel: a.pixel, ok: false, error: err.error ? err.error.message : "capi_error" };
    } catch (e) {
      return { pixel: a.pixel, ok: false, error: "fetch_failed" };
    }
  }));
  // Sempre 2xx para o kit (ele só checa r.ok).
  return json({ ok: true, configured: true, results });
}

// ---------------------- Pesquisa de saída (LPs de Ads) ----------------------
// Quem sai da página sem se cadastrar. Não cria lead no Pipedrive, Orbit,
// Mailchimp nem ManyChat. A leitura fica em /saida-ads.
const SAIDA_PAGINAS = new Set([
  "/consultoria/iso-9001-lp",
  "/consultoria/iso-27001",
  "/consultoria/iso-14001",
  "/consultoria/iso-45001",
  "/consultoria/pbqp-h",
  "/consultoria/sassmaq-4-0",
]);
const SAIDA_MOTIVOS = {
  pesquisando: {
    label: "Ainda estou só pesquisando",
    detalhes: {
      comparar: "Quero comparar com outras consultorias",
      prazo: "Quero entender o prazo até certificar",
      porte: "Quero ver se serve para o porte da empresa",
      estudando: "Só estou estudando a norma",
    },
  },
  preco: {
    label: "Queria o preço antes de cadastrar",
    detalhes: {
      faixa: "Queria uma faixa de investimento antes de falar com alguém",
      caro: "Achei que ia ser caro demais",
      diretoria: "Preciso levar um número para a diretoria",
      outro_preco: "Preço não era o problema",
    },
  },
  depois: {
    label: "Não ficou claro o que acontece depois",
    detalhes: {
      ligacao: "Não quero que alguém me ligue agora",
      tempo: "Não entendi quanto tempo leva o diagnóstico",
      compromisso: "Não ficou claro se tem custo ou compromisso",
      diferenca: "Não entendi o que a Templum faz de diferente",
    },
  },
  momento: {
    label: "Não é o momento da minha empresa",
    detalhes: {
      prioridade: "A certificação ainda não é prioridade",
      contrato: "Estou esperando um contrato ou uma licitação",
      equipe: "Falta gente na equipe para tocar isso",
      norma: "Queria só entender a norma, sem consultoria",
    },
  },
  confianca: {
    label: "Faltou confiança para deixar meus dados",
    detalhes: {
      cases: "Queria ver cases do meu setor",
      marca: "Não conhecia a Templum",
      garantia: "A garantia não ficou clara",
      generico: "A página pareceu genérica demais",
    },
  },
  formulario: {
    label: "O formulário pediu coisa demais",
    detalhes: {
      telefone: "Pediu telefone cedo demais",
      campos: "Eram muitos campos",
      abordagem: "Não quero ser abordado agora",
      whatsapp: "Prefiro chamar no WhatsApp",
    },
  },
  falar: {
    label: "Quero falar com alguém antes de cadastrar",
    detalhes: {
      ligar: "Prefiro que alguém me explique por telefone",
      whatsapp_agora: "Prefiro continuar no WhatsApp",
      reuniao: "Quero marcar uma conversa, sem formulário",
    },
  },
  ja_tem: {
    label: "Já estou resolvendo a certificação",
    detalhes: {
      consultoria: "Já tenho uma consultoria",
      processo: "Já começamos a certificação",
      interno: "Vamos tocar isso com a equipe interna",
    },
  },
  curiosidade: {
    label: "Entrei por curiosidade, não para contratar",
    detalhes: {
      conteudo: "Queria conteúdo, não um cadastro",
      anuncio: "O anúncio me trouxe, mas não era isso",
      norma_solta: "Queria só entender a norma",
    },
  },
  outro: { label: "Outro motivo", detalhes: {} },
};
const SAIDA_GATILHOS = new Set(["mouse", "voltar", "preview"]);
const SAIDA_ANGULOS = new Set(["momento", "pagina", "proximo"]);

function saidaPath(value) {
  let s = String(value || "").split("?")[0].split("#")[0].trim();
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}
function saidaClip(value, max) {
  return String(value || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}
function saidaInt(value, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, n));
}

async function handleSaida(request, env) {
  let body;
  try { body = await request.json(); }
  catch (_) { return corsJson({ ok: false, error: "invalid_json" }, 400); }

  if (saidaClip(body.company_url, 80)) return corsJson({ ok: true });

  const pagina = saidaPath(body.pagina);
  if (!SAIDA_PAGINAS.has(pagina)) return corsJson({ ok: false, error: "pagina" }, 400);

  const motivoId = String(body.motivo || "");
  const motivo = SAIDA_MOTIVOS[motivoId];
  if (!motivo) return corsJson({ ok: false, error: "motivo" }, 400);

  const detalheId = String(body.detalhe || "");
  if (detalheId && !motivo.detalhes[detalheId]) return corsJson({ ok: false, error: "detalhe" }, 400);

  const clientId = String(body.client_id || "");
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
    return corsJson({ ok: false, error: "client_id" }, 400);
  }

  const gatilhoBruto = String(body.gatilho || "").split("|");
  const gatilhoBase = SAIDA_GATILHOS.has(gatilhoBruto[0]) ? gatilhoBruto[0] : "mouse";
  const angulo = SAIDA_ANGULOS.has(gatilhoBruto[1]) ? gatilhoBruto[1] : "";
  const gatilho = angulo ? gatilhoBase + "|" + angulo : gatilhoBase;
  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey) return corsJson({ ok: false, error: "not_configured" }, 500);

  const payload = {
    client_id: clientId,
    pagina,
    norma: saidaClip(body.norma, 80),
    motivo: motivoId,
    motivo_label: motivo.label,
    detalhe: detalheId,
    detalhe_label: detalheId ? motivo.detalhes[detalheId] : "",
    comentario: saidaClip(body.comentario, 400),
    gatilho,
    dispositivo: body.dispositivo === "mobile" ? "mobile" : "desktop",
    tempo_s: saidaInt(body.tempo_s, 0, 7200),
    rolagem_pct: saidaInt(body.rolagem_pct, 0, 100),
    form_iniciado: body.form_iniciado === true,
    utm_source: saidaClip(body.utm_source, 200),
    utm_medium: saidaClip(body.utm_medium, 200),
    utm_campaign: saidaClip(body.utm_campaign, 200),
    utm_content: saidaClip(body.utm_content, 200),
    utm_term: saidaClip(body.utm_term, 200),
    gclid: saidaClip(body.gclid, 200),
  };

  try {
    const res = await fetch(`${sbUrl}/rest/v1/rpc/salvar_saida_pesquisa`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: sbKey,
        authorization: "Bearer " + sbKey,
      },
      body: JSON.stringify({ p: payload }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      console.error("[saida] insert falhou", res.status, err.slice(0, 180));
      return corsJson({ ok: false, error: "save_failed" }, 502);
    }
    return corsJson({ ok: true });
  } catch (_) {
    return corsJson({ ok: false, error: "fetch_failed" }, 502);
  }
}

async function handleSaidaRead(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const expected = "Templum@2026";
  if (token !== expected) return json({ ok: false, error: "unauthorized" }, 401);

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey) return json({ ok: false, error: "no_supabase_service_key" }, 500);

  const cols = "id,created_at,pagina,norma,motivo,motivo_label,detalhe,detalhe_label,comentario,gatilho,dispositivo,tempo_s,rolagem_pct,form_iniciado,utm_source,utm_medium,utm_campaign,utm_content,utm_term,gclid";
  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/site_saida_pesquisa?select=${cols}&order=created_at.desc&limit=2000`,
      {
        headers: {
          apikey: sbKey,
          authorization: "Bearer " + sbKey,
          accept: "application/json",
        },
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return json({ ok: false, error: "supabase_" + res.status, detail: err.slice(0, 180) }, 502);
    }
    const data = await res.json();
    return new Response(JSON.stringify({ ok: true, data }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed", detail: e.message }, 502);
  }
}

// ---------------------- Leads Read (GET /api/leads) ----------------------
async function handleLeadsRead(request, env) {
  // Verifica token na query: /api/leads?token=<senha>
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";

  if (token !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  // Para leitura usa service key se disponível, senão tenta anon
  const sbKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;

  if (!sbKey) {
    return new Response(JSON.stringify({ ok: false, error: "no_supabase_key" }), {
      status: 500,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const page = parseInt(url.searchParams.get("page") || "0", 10);
  const limit = 1000;
  const offset = page * limit;

  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/site_leads?select=id,created_at,nome,email,telefone,empresa,norma,cargo,desafio,mensagem,pagina,evento,status_pagamento,valor_pago,data_pagamento,utm_source,utm_medium,utm_campaign,utm_content,utm_source_ft,utm_campaign_ft,gclid,fbclid&order=created_at.desc&limit=${limit}&offset=${offset}`,
      {
        headers: {
          "apikey": sbKey,
          "Authorization": "Bearer " + sbKey,
          "Accept": "application/json",
          "Range-Unit": "items",
          "Prefer": "count=exact",
        },
      }
    );

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, error: "supabase_" + res.status, detail: err.slice(0, 200) }), {
        status: 502,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const data = await res.json();
    const total = res.headers.get("Content-Range")
      ? parseInt((res.headers.get("Content-Range") || "").split("/")[1] || "0", 10)
      : data.length;

    return new Response(JSON.stringify({ ok: true, data, total }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "fetch_failed", detail: e.message }), {
      status: 502,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

// ---------------------- CRM Report (GET /api/crm-report) ----------------------
// Devolve os leads do funil INBOUND real da Templum Consultoria (tabela
// templum_inbound_leads, espelhada do Orbit via templum-inbound-sync a cada hora;
// RLS ligado — só service_role lê). O front-end (/relatorio-inbound) recebe os
// dados crus e monta os 3 painéis (Desempenho, Conversão, Progresso) no cliente,
// aplicando filtro de responsável/fonte/período sem precisar de outro round-trip.
async function handleCrmReport(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (token !== expected) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey) return json({ ok: false, error: "no_supabase_service_key" }, 500);

  const h = { apikey: sbKey, Authorization: "Bearer " + sbKey, Accept: "application/json" };
  const cols = "lead_id,stage_name,stage_order,status,value,responsible_name,source,utm_source,created_at,closed_at";

  try {
    const leads = [];
    let from = 0;
    const size = 1000;
    for (;;) {
      const res = await fetch(`${sbUrl}/rest/v1/templum_inbound_leads?select=${cols}&order=created_at.desc`, {
        headers: { ...h, Range: `${from}-${from + size - 1}` },
      });
      if (!res.ok) return json({ ok: false, error: "supabase_error", status: res.status }, 502);
      const batch = await res.json();
      leads.push(...batch);
      if (batch.length < size) break;
      from += size;
    }
    return new Response(JSON.stringify({ ok: true, leads }), {
      status: 200,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
    });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed", detail: e.message }, 502);
  }
}

// ---------------------- Leads Delete (DELETE /api/leads) ----------------------
async function handleLeadDelete(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (token !== expected) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const id = url.searchParams.get("id") || "";
  if (!id) {
    return new Response(JSON.stringify({ ok: false, error: "id_required" }), {
      status: 400,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  // Delete exige a service key (RLS normalmente só libera insert pra anon key).
  const sbKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  if (!sbKey) {
    return new Response(JSON.stringify({ ok: false, error: "no_supabase_key" }), {
      status: 500,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }

  try {
    const res = await fetch(`${sbUrl}/rest/v1/site_leads?id=eq.${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: {
        "apikey": sbKey,
        "Authorization": "Bearer " + sbKey,
        "Prefer": "return=minimal",
      },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return new Response(JSON.stringify({ ok: false, error: "supabase_" + res.status, detail: err.slice(0, 200) }), {
        status: 502,
        headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "fetch_failed", detail: e.message }), {
      status: 502,
      headers: { "content-type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}

// =====================================================================
// RAFFLE — sorteio ao vivo webinar
// =====================================================================

async function handleRaffleInsert(request, env) {
  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  // Mesma razão de saveToSupabase: `anon` não insere mais. (A tabela
  // webinar_raffle_entries também não existe mais no banco — esta rota é do
  // sorteio do webinar do Nigel, 09/07, e hoje falharia de qualquer forma.)
  const sbKey = env.SUPABASE_SERVICE_KEY || env.SUPABASE_ANON_KEY;
  if (!sbKey) return json({ ok: false, error: "not_configured" }, 500);

  let body = {};
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "invalid_json" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json({ ok: false, error: "invalid_email" }, 422);

  const webinar_slug = body.webinar_slug || "nigel-croft-0907";

  // Gera número do sorteio: conta inscritos + 1001 (começa em 1001)
  let raffle_number = 1001;
  try {
    const countRes = await fetch(
      `${sbUrl}/rest/v1/webinar_raffle_entries?select=id&webinar_slug=eq.${encodeURIComponent(webinar_slug)}`,
      { headers: { "apikey": sbKey, "Authorization": "Bearer " + sbKey, "Prefer": "count=exact" } }
    );
    const cr = countRes.headers.get("Content-Range") || "";
    const total = parseInt(cr.split("/")[1] || "0", 10);
    raffle_number = 1001 + total;
  } catch (_) {}

  try {
    const r = await fetch(`${sbUrl}/rest/v1/webinar_raffle_entries`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": sbKey,
        "Authorization": "Bearer " + sbKey,
        "Prefer": "return=representation",
      },
      body: JSON.stringify({
        webinar_slug,
        nome: body.nome || "",
        email,
        telefone: body.telefone || "",
        empresa: body.empresa || "",
        nps: body.nps != null ? parseInt(body.nps, 10) : null,
        raffle_number,
      }),
    });

    if (r.ok) {
      const data = await r.json().catch(() => [{}]);
      return json({ ok: true, raffle_number: (data[0] || {}).raffle_number || raffle_number });
    }

    const err = await r.text().catch(() => "");
    // Email duplicado → retorna número já cadastrado
    if (err.includes("raffle_email_webinar_idx") || err.includes("duplicate")) {
      // Busca número existente
      const existing = await fetch(
        `${sbUrl}/rest/v1/webinar_raffle_entries?select=raffle_number&email=eq.${encodeURIComponent(email)}&webinar_slug=eq.${encodeURIComponent(webinar_slug)}&limit=1`,
        { headers: { "apikey": sbKey, "Authorization": "Bearer " + sbKey } }
      );
      const ex = await existing.json().catch(() => []);
      return json({ ok: true, raffle_number: (ex[0] || {}).raffle_number || raffle_number, duplicate: true });
    }

    return json({ ok: false, error: err.slice(0, 120) }, 500);
  } catch (e) {
    return json({ ok: false, error: "fetch_failed" }, 500);
  }
}

async function handleRaffleRead(request, env) {
  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey) return json({ ok: false, error: "service_key_required" }, 401);

  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (token !== expected) return json({ ok: false, error: "unauthorized" }, 401);

  const webinar_slug = url.searchParams.get("webinar") || "nigel-croft-0907";

  try {
    const res = await fetch(
      `${sbUrl}/rest/v1/webinar_raffle_entries?select=*&webinar_slug=eq.${encodeURIComponent(webinar_slug)}&order=raffle_number.asc`,
      { headers: { "apikey": sbKey, "Authorization": "Bearer " + sbKey, "Prefer": "count=exact" } }
    );
    const data = await res.json();
    const total = parseInt((res.headers.get("Content-Range") || "").split("/")[1] || "0", 10);
    return json({ ok: true, data, total });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed" }, 500);
  }
}

async function handleRaffleDraw(request, env) {
  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey) return json({ ok: false, error: "service_key_required" }, 401);

  let body = {};
  try { body = await request.json(); } catch (_) {}
  const token = body.token || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (token !== expected) return json({ ok: false, error: "unauthorized" }, 401);

  const webinar_slug = body.webinar_slug || "nigel-croft-0907";

  try {
    // Busca todos os participantes
    const res = await fetch(
      `${sbUrl}/rest/v1/webinar_raffle_entries?select=id,nome,email,raffle_number&webinar_slug=eq.${encodeURIComponent(webinar_slug)}&order=raffle_number.asc`,
      { headers: { "apikey": sbKey, "Authorization": "Bearer " + sbKey } }
    );
    const entries = await res.json();
    if (!entries.length) return json({ ok: false, error: "no_entries" }, 400);

    // Sorteia aleatoriamente
    const winner = entries[Math.floor(Math.random() * entries.length)];

    // Marca como vencedor no banco
    await fetch(
      `${sbUrl}/rest/v1/webinar_raffle_entries?id=eq.${winner.id}`,
      {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "apikey": sbKey,
          "Authorization": "Bearer " + sbKey,
        },
        body: JSON.stringify({ winner: true }),
      }
    );

    return json({ ok: true, winner });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed" }, 500);
  }
}

// =====================================================================
// PIPEDRIVE — busca por email (Status, Etapa, Motivo de Arquivamento)
// =====================================================================

async function handlePipedriveSearch(request, env) {
  const url = new URL(request.url);

  // Protege com a mesma senha da página de leads
  const token = url.searchParams.get("token") || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (token !== expected) return json({ ok: false, error: "unauthorized" }, 401);

  const email = (url.searchParams.get("email") || "").trim().toLowerCase();
  if (!email) return json({ ok: false, error: "email_required" }, 400);

  const PD_TOKEN = env.PIPEDRIVE_API_TOKEN;
  if (!PD_TOKEN) return json({ ok: false, error: "pipedrive_not_configured" }, 500);

  const BASE = "https://api.pipedrive.com/v1";

  try {
    // 1. Busca pessoa por email (exact_match)
    const searchRes = await fetch(
      `${BASE}/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&api_token=${PD_TOKEN}`
    );
    const searchData = await searchRes.json();

    if (!searchData.data?.items?.length) {
      return json({ ok: true, found: false });
    }

    const personId = searchData.data.items[0].item.id;

    // 2. Busca negócios da pessoa (mais recente primeiro)
    const dealsRes = await fetch(
      `${BASE}/persons/${personId}/deals?sort=update_time+DESC&limit=10&api_token=${PD_TOKEN}`
    );
    const dealsData = await dealsRes.json();

    if (!dealsData.data?.length) {
      return json({ ok: true, found: true, person_id: personId, deals: [] });
    }

    // 3. Busca etapas para mapear stage_id → nome
    const stagesRes = await fetch(`${BASE}/stages?api_token=${PD_TOKEN}`);
    const stagesData = await stagesRes.json();
    const stageMap = {};
    (stagesData.data || []).forEach(s => { stageMap[s.id] = s.name; });

    const statusLabel = { open: "Em andamento", won: "Ganho", lost: "Perdido", deleted: "Deletado" };

    const deals = dealsData.data.map(d => ({
      id: d.id,
      title: d.title || "",
      status: statusLabel[d.status] || d.status,
      stage: stageMap[d.stage_id] || `Etapa ${d.stage_id}`,
      lost_reason: d.lost_reason || null,
      update_time: d.update_time,
    }));

    return json({ ok: true, found: true, person_id: personId, deals });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed", detail: e.message }, 500);
  }
}

// =====================================================================
// PIPEDRIVE BATCH — busca múltiplos emails de uma vez (paginação /leads)
// =====================================================================

async function handlePipedriveBatch(request, env) {
  let body = {};
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "invalid_json" }, 400); }

  const token = body.token || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (token !== expected) return json({ ok: false, error: "unauthorized" }, 401);

  const emails = (body.emails || []).filter(Boolean).slice(0, 50); // máx 50 por batch
  if (!emails.length) return json({ ok: true, results: {} });

  const PD_TOKEN = env.PIPEDRIVE_API_TOKEN;
  if (!PD_TOKEN) return json({ ok: false, error: "pipedrive_not_configured" }, 500);

  const BASE = "https://api.pipedrive.com/v1";
  const statusLabel = { open: "Em andamento", won: "Ganho", lost: "Perdido", deleted: "Deletado" };

  try {
    // Busca estágios 1x — compartilhado por todos os emails
    const stagesRes = await fetch(`${BASE}/stages?api_token=${PD_TOKEN}`);
    const stagesData = await stagesRes.json();
    const stageMap = {};
    (stagesData.data || []).forEach(s => { stageMap[s.id] = s.name; });

    // Processa todos os emails em paralelo
    const results = {};
    await Promise.all(emails.map(async (email) => {
      try {
        const searchRes = await fetch(
          `${BASE}/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&api_token=${PD_TOKEN}`
        );
        const searchData = await searchRes.json();

        if (!searchData.data?.items?.length) {
          results[email] = { found: false };
          return;
        }

        const personId = searchData.data.items[0].item.id;

        const dealsRes = await fetch(
          `${BASE}/persons/${personId}/deals?sort=update_time+DESC&limit=1&api_token=${PD_TOKEN}`
        );
        const dealsData = await dealsRes.json();

        if (!dealsData.data?.length) {
          results[email] = { found: true, no_deals: true };
          return;
        }

        const d = dealsData.data[0];
        results[email] = {
          found: true,
          status: statusLabel[d.status] || d.status,
          stage: stageMap[d.stage_id] || "",
          lost_reason: d.lost_reason || null,
        };
      } catch (_) {
        results[email] = { found: false, error: true };
      }
    }));

    return json({ ok: true, results });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed", detail: e.message }, 500);
  }
}

// =====================================================================
// ASAAS — webhook de pagamento (produtos pagos, ex.: Planejamento Estratégico)
// =====================================================================

// paymentLink (Asaas) → evento (site_leads) de cada produto pago ativo.
// O id do link é o mesmo trecho depois de "asaas.com/c/" na URL de checkout.
const ASAAS_PRODUTOS = {
  "c87t7y02ktlsq407": "planejamento-estrategico-2027",
};

const ASAAS_EVENTOS_PAGAMENTO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

async function handleAsaasWebhook(request, env) {
  // Autenticação: header customizado (definido por nós ao cadastrar o webhook no painel Asaas).
  const token = request.headers.get("asaas-access-token") || "";
  const expected = env.ASAAS_WEBHOOK_TOKEN || "";
  if (!expected || token !== expected) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  let body = {};
  try { body = await request.json(); } catch (_) { return json({ ok: true }); }

  const event = body.event || "";
  const payment = body.payment || {};
  if (!ASAAS_EVENTOS_PAGAMENTO.has(event)) return json({ ok: true, skipped: "event" });

  const evento = ASAAS_PRODUTOS[payment.paymentLink];
  if (!evento) {
    console.error("[asaas-webhook] paymentLink não mapeado:", payment.paymentLink);
    return json({ ok: true, skipped: "payment_link" });
  }

  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_SERVICE_KEY;
  if (!sbKey) return json({ ok: false, error: "no_supabase_key" }, 500);
  const sbHeaders = { apikey: sbKey, Authorization: "Bearer " + sbKey };

  // Idempotência — o Asaas reenvia webhook (at-least-once): se esse payment.id já
  // foi processado antes, não faz nada.
  try {
    const dup = await fetch(
      `${sbUrl}/rest/v1/site_leads?asaas_payment_id=eq.${encodeURIComponent(payment.id)}&select=id&limit=1`,
      { headers: sbHeaders }
    );
    const dupData = await dup.json().catch(() => []);
    if (Array.isArray(dupData) && dupData.length) return json({ ok: true, skipped: "duplicate" });
  } catch (e) {
    console.error("[asaas-webhook] falha ao checar duplicidade", e && e.message);
  }

  // O webhook não manda e-mail/nome — busca na API do Asaas pelo customer id.
  let customerEmail = "", customerName = "";
  try {
    const custRes = await fetch(`https://api.asaas.com/v3/customers/${payment.customer}`, {
      headers: {
        access_token: env.ASAAS_API_KEY || "",
        "User-Agent": "Templum-Site/1.0 (site-templum worker)",
      },
    });
    if (custRes.ok) {
      const cust = await custRes.json();
      customerEmail = (cust.email || "").trim().toLowerCase();
      customerName = cust.name || "";
    } else {
      console.error("[asaas-webhook] customers API respondeu", custRes.status);
    }
  } catch (e) {
    console.error("[asaas-webhook] falha ao buscar customer", e && e.message);
  }

  const pagamentoFields = {
    status_pagamento: "pago",
    valor_pago: payment.value ?? null,
    asaas_payment_id: payment.id,
    asaas_customer_id: payment.customer || null,
    data_pagamento: payment.confirmedDate || payment.paymentDate || new Date().toISOString(),
  };

  // Tenta casar com o lead 'pendente' que a pessoa criou preenchendo o form antes do checkout
  // (mesmo e-mail + mesmo evento). Se o e-mail digitado no Asaas for diferente do form, não casa.
  let matched = false;
  if (customerEmail) {
    try {
      const find = await fetch(
        `${sbUrl}/rest/v1/site_leads?email=eq.${encodeURIComponent(customerEmail)}&evento=eq.${encodeURIComponent(evento)}&order=created_at.desc&limit=1&select=id`,
        { headers: sbHeaders }
      );
      const rows = await find.json().catch(() => []);
      if (Array.isArray(rows) && rows.length) {
        const upd = await fetch(`${sbUrl}/rest/v1/site_leads?id=eq.${encodeURIComponent(rows[0].id)}`, {
          method: "PATCH",
          headers: { ...sbHeaders, "content-type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify(pagamentoFields),
        });
        matched = upd.ok;
        if (!upd.ok) console.error("[asaas-webhook] falha ao atualizar lead", await upd.text().catch(() => ""));
      }
    } catch (e) {
      console.error("[asaas-webhook] falha ao casar lead", e && e.message);
    }
  }

  // Sem lead correspondente (e-mail diferente do form, ou compra direta sem passar pelo form):
  // cria um registro novo, pra nenhum pagamento ficar invisível.
  if (!matched) {
    try {
      const ins = await fetch(`${sbUrl}/rest/v1/site_leads`, {
        method: "POST",
        headers: { ...sbHeaders, "content-type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({
          nome: customerName, email: customerEmail, evento, pagina: "asaas-webhook",
          ...pagamentoFields,
        }),
      });
      if (!ins.ok) console.error("[asaas-webhook] falha ao criar lead de fallback", await ins.text().catch(() => ""));
    } catch (e) {
      console.error("[asaas-webhook] falha ao criar lead de fallback", e && e.message);
    }
  }

  return json({ ok: true, matched });
}

// ---- Descadastrar e-mail (Templum OS) --------------------------------------
// Fonte da verdade: tag `email-opt-out` em todo card do CRM daquele e-mail.
// Os Fluxos param na condicional de etiqueta. Página: /emails/descadastrar
const EMAIL_OPT_OUT_TAG = "email-opt-out";

function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase();
}

async function hmacHex(secret, msg) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  const x = String(a || "");
  const y = String(b || "");
  if (x.length !== y.length) return false;
  let out = 0;
  for (let i = 0; i < x.length; i++) out |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return out === 0;
}

const PESQUISA_GF_TAG = "pesquisa-gf:respondida";
const PESQUISA_GF_GRUPO_TAG = "pesquisa-gf:grupo";
const PESQUISA_GF_FIELDS = new Set([
  "cf_gf_conhece_templum_os",
  "cf_gf_controle_financeiro",
  "cf_gf_atrapalha_numeros",
  "cf_gf_quer_sair_sabendo",
  "cf_gf_prioridade_meses",
  "cf_gf_faixa_receita",
  "cf_gf_investe_ferramenta",
  "cf_gf_quando_solucao",
  "cf_gf_comentario_live",
]);

function pesquisaGfValue(value) {
  if (Array.isArray(value)) {
    return value.map((v) => String(v || "").trim()).filter(Boolean).join(", ").slice(0, 4000);
  }
  return String(value || "").trim().slice(0, 4000);
}

function tagName(tag) {
  if (!tag) return "";
  if (typeof tag === "string") return tag;
  if (typeof tag === "object") return String(tag.name || tag.tag || tag.label || "").trim();
  return String(tag);
}

function leadTagList(lead) {
  const tags = lead && lead.tags;
  if (Array.isArray(tags)) return tags.map(tagName).map((t) => t.toLowerCase()).filter(Boolean);
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  return [];
}

function leadContactEmail(lead) {
  return normalizeEmail(lead && (lead.contact_email || lead.email));
}

function pickPesquisaGfLead(leads) {
  const mql = (leads || []).filter(isOpenCrmLead).filter((l) => l.pipeline_id === ORBIT_MQL_PIPELINE_ID);
  const campaign = mql.filter((l) => leadTagList(l).some((t) => t.includes("financeira") || t.includes("intervalo")));
  return campaign[0] || mql[0] || null;
}

async function resolvePesquisaGfLead(body, token, headers) {
  const leadId = String(body?.lead_id || "").trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
    return { leadId, fromGroup: false };
  }
  const origem = String(body?.origem || "").trim().toLowerCase();
  const email = normalizeEmail(body?.email);
  if (origem !== "grupo" || !email || !email.includes("@")) return { error: "lead_id", status: 400 };
  const rows = await crmSearchLeadsByEmail(token, email);
  const full = [];
  for (const row of rows.slice(0, 10)) {
    if (!row || !row.id) continue;
    if (row.pipeline_id) {
      full.push(row);
      continue;
    }
    const one = await fetch(`${ORBIT_BASE}/leads/${row.id}`, { headers });
    if (!one.ok) continue;
    const d = await one.json().catch(() => ({}));
    full.push(d.data || d.lead || d);
  }
  const chosen = pickPesquisaGfLead(full);
  if (!chosen || !chosen.id) return { error: "email_not_found", status: 404 };
  return { leadId: chosen.id, fromGroup: true };
}

async function handlePesquisaGf(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return corsJson({ ok: false, error: "invalid_json" }, 400);
  }
  const incoming = body?.answers && typeof body.answers === "object" ? body.answers : {};
  const custom = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!PESQUISA_GF_FIELDS.has(key)) continue;
    const val = pesquisaGfValue(value);
    if (val) custom[key] = val;
  }
  if (!Object.keys(custom).length) return corsJson({ ok: false, error: "empty" }, 400);

  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return corsJson({ ok: false, error: "not_configured" }, 500);
  const headers = {
    "content-type": "application/json",
    authorization: "Bearer " + token,
    accept: "application/json",
  };
  try {
    const resolved = await resolvePesquisaGfLead(body, token, headers);
    if (resolved.error) return corsJson({ ok: false, error: resolved.error }, resolved.status || 400);
    const leadId = resolved.leadId;
    const get = await fetch(`${ORBIT_BASE}/leads/${leadId}`, { headers });
    if (!get.ok) return corsJson({ ok: false, error: "lead_not_found" }, 404);
    const payload = await get.json().catch(() => ({}));
    const lead = payload.data || payload.lead || payload;
    const prev = lead.custom_fields && typeof lead.custom_fields === "object" ? lead.custom_fields : null;
    const tags = [PESQUISA_GF_TAG];
    if (resolved.fromGroup) tags.push(PESQUISA_GF_GRUPO_TAG);
    const patch = {
      tags: mergeLeadTags(lead.tags, tags),
      custom_fields: prev ? { ...prev, ...custom } : custom,
    };
    const res = await fetch(`${ORBIT_BASE}/leads/${leadId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const e = await res.text().catch(() => "");
      return corsJson({ ok: false, error: String(e).slice(0, 180) }, 502);
    }
    return corsJson({ ok: true, lead_id: leadId });
  } catch (_) {
    return corsJson({ ok: false, error: "fetch_failed" }, 502);
  }
}

const PESQUISA_NE_TAG = "pesquisa-ne:respondida";
const PESQUISA_NE_TAG_NOVA_ERA = "nova era da iso";
const PESQUISA_NE_FIELDS = new Set([
  "cf_ne_momento_iso",
  "cf_ne_como_gerencia",
  "cf_ne_maior_desafio_sg",
  "cf_ne_descobrir_live",
  "cf_ne_pretende_investir",
]);

function namesLikelyMatch(a, b) {
  const na = String(a || "").trim().toLowerCase().replace(/\s+/g, " ");
  const nb = String(b || "").trim().toLowerCase().replace(/\s+/g, " ");
  if (!na || !nb) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

function pickPesquisaNeLead(leads, nome) {
  const open = (leads || []).filter(isOpenCrmLead);
  const tagged = open.filter((l) => leadTagList(l).includes(PESQUISA_NE_TAG_NOVA_ERA));
  const taggedLives = tagged.filter((l) => l.pipeline_id === ORBIT_LIVES_PIPELINE_ID);
  const lives = open.filter((l) => l.pipeline_id === ORBIT_LIVES_PIPELINE_ID);
  const taggedMql = tagged.filter((l) => l.pipeline_id === ORBIT_MQL_PIPELINE_ID);
  const pool = taggedLives.length ? taggedLives : (lives.length ? lives : (taggedMql.length ? taggedMql : []));
  if (!pool.length) return null;
  if (nome) {
    const byName = pool.find((l) => namesLikelyMatch(l.contact_name || l.title, nome));
    if (byName) return byName;
  }
  return pool[0];
}

async function resolvePesquisaNeLead(body, token, headers) {
  const leadId = String(body?.lead_id || "").trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId)) {
    return { leadId, fromLookup: false };
  }
  const email = normalizeEmail(body?.email);
  const nome = String(body?.nome || "").trim();
  if (!email || !email.includes("@") || !nome) return { error: "identity", status: 400 };
  const rows = await crmSearchLeadsByEmail(token, email);
  const full = [];
  for (const row of rows.slice(0, 10)) {
    if (!row || !row.id) continue;
    if (row.pipeline_id && Array.isArray(row.tags)) {
      full.push(row);
      continue;
    }
    const one = await fetch(`${ORBIT_BASE}/leads/${row.id}`, { headers });
    if (!one.ok) continue;
    const d = await one.json().catch(() => ({}));
    full.push(d.data || d.lead || d);
  }
  const chosen = pickPesquisaNeLead(full, nome);
  if (!chosen || !chosen.id) return { error: "email_not_found", status: 404 };
  return { leadId: chosen.id, fromLookup: true, nome };
}

async function handlePesquisaNe(request, env) {
  let body;
  try {
    body = await request.json();
  } catch (_) {
    return corsJson({ ok: false, error: "invalid_json" }, 400);
  }
  const incoming = body?.answers && typeof body.answers === "object" ? body.answers : {};
  const custom = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!PESQUISA_NE_FIELDS.has(key)) continue;
    const val = pesquisaGfValue(value);
    if (val) custom[key] = val;
  }
  if (Object.keys(custom).length < 5) return corsJson({ ok: false, error: "empty" }, 400);

  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return corsJson({ ok: false, error: "not_configured" }, 500);
  const headers = {
    "content-type": "application/json",
    authorization: "Bearer " + token,
    accept: "application/json",
  };
  try {
    const resolved = await resolvePesquisaNeLead(body, token, headers);
    if (resolved.error) return corsJson({ ok: false, error: resolved.error }, resolved.status || 400);
    const leadId = resolved.leadId;
    const get = await fetch(`${ORBIT_BASE}/leads/${leadId}`, { headers });
    if (!get.ok) return corsJson({ ok: false, error: "lead_not_found" }, 404);
    const payload = await get.json().catch(() => ({}));
    const lead = payload.data || payload.lead || payload;
    const prev = lead.custom_fields && typeof lead.custom_fields === "object" ? lead.custom_fields : null;
    const nome = String(body?.nome || resolved.nome || "").trim();
    const patch = {
      tags: mergeLeadTags(lead.tags, [PESQUISA_NE_TAG]),
      custom_fields: prev ? { ...prev, ...custom } : custom,
    };
    if (nome && !String(lead.contact_name || "").trim()) patch.contact_name = nome;
    const res = await fetch(`${ORBIT_BASE}/leads/${leadId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const e = await res.text().catch(() => "");
      return corsJson({ ok: false, error: String(e).slice(0, 180) }, 502);
    }
    return corsJson({ ok: true, lead_id: leadId });
  } catch (_) {
    return corsJson({ ok: false, error: "fetch_failed" }, 502);
  }
}

function mergeLeadTags(existing, incoming) {
  const set = new Set((existing || []).map(tagName).filter(Boolean));
  for (const t of incoming) if (t) set.add(t);
  let tags = [...set];
  if (tags.length > 20) {
    const rest = tags.filter((t) => t !== EMAIL_OPT_OUT_TAG);
    tags = [EMAIL_OPT_OUT_TAG, ...rest].slice(0, 20);
  }
  return tags;
}

async function verifyOptOutSig(env, email, sig) {
  if (!sig) return true;
  const secret = env.UNSUB_HMAC_SECRET || env.ORBIT_CRM_API_KEY || "";
  if (!secret) return false;
  const expected = await hmacHex(secret, normalizeEmail(email));
  return timingSafeEqual(expected, String(sig).toLowerCase());
}

async function crmSearchLeadsByEmail(token, email) {
  const r = await fetch(
    `${ORBIT_BASE}/leads/search?term=${encodeURIComponent(email)}&limit=50`,
    { headers: { authorization: "Bearer " + token, accept: "application/json" } },
  );
  if (!r.ok) return [];
  const j = await r.json().catch(() => ({}));
  const rows = j.data || j.leads || [];
  const full = [];
  for (const lead of rows.slice(0, 15)) {
    if (!lead || !lead.id) continue;
    const hasEmail = !!leadContactEmail(lead);
    const hasTags = Array.isArray(lead.tags) && lead.tags.some((t) => tagName(t));
    let row = lead;
    if (!hasEmail || !hasTags || !lead.pipeline_id) {
      const one = await fetch(`${ORBIT_BASE}/leads/${lead.id}`, {
        headers: { authorization: "Bearer " + token, accept: "application/json" },
      });
      if (one.ok) {
        const d = await one.json().catch(() => ({}));
        row = d.data || d.lead || d;
      }
    }
    if (leadContactEmail(row) === email) full.push(row);
  }
  return full;
}

async function tagCrmLeadsOptOut(token, leads) {
  const headers = {
    authorization: "Bearer " + token,
    "content-type": "application/json",
    accept: "application/json",
  };
  const tagged = [];
  const errors = [];
  for (const lead of leads) {
    if (!lead.id) continue;
    const tags = mergeLeadTags(lead.tags, [EMAIL_OPT_OUT_TAG]);
    const res = await fetch(`${ORBIT_BASE}/leads/${lead.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ tags }),
    });
    if (res.ok) tagged.push({ id: lead.id, pipeline_id: lead.pipeline_id || null });
    else errors.push({ id: lead.id, status: res.status });
  }
  return { tagged, errors };
}

async function unsubMailchimp(email, env) {
  if (!env.MAILCHIMP_API_KEY || !env.MAILCHIMP_LIST_ID) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }
  const dc = env.MAILCHIMP_API_KEY.split("-")[1];
  if (!dc) return { ok: false, skipped: true, reason: "invalid_key" };
  const hash = md5hex(email);
  const auth = "Basic " + btoa("anystring:" + env.MAILCHIMP_API_KEY);
  try {
    const r = await fetch(
      `https://${dc}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}/members/${hash}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: auth },
        body: JSON.stringify({ status: "unsubscribed" }),
      },
    );
    if (r.ok) return { ok: true };
    if (r.status === 404) return { ok: true, skipped: true, reason: "not_on_list" };
    const e = await r.json().catch(() => ({}));
    return { ok: false, error: e.title || "mailchimp_error" };
  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// GET /api/email-opt-out?email=&token=  → link para colar no Fluxo (teste)
async function handleEmailOptOutLink(request, env) {
  const url = new URL(request.url);
  const pass = url.searchParams.get("token") || "";
  const expected = env.LEADS_PASSWORD || "Templum@3321";
  if (pass !== expected) return json({ ok: false, error: "unauthorized" }, 401);
  const email = normalizeEmail(url.searchParams.get("email"));
  if (!email.includes("@")) return json({ ok: false, error: "invalid_email" }, 400);
  const secret = env.UNSUB_HMAC_SECRET || env.ORBIT_CRM_API_KEY || "";
  if (!secret) return json({ ok: false, error: "missing_secret" }, 500);
  const s = await hmacHex(secret, email);
  const page = `https://templum.com.br/emails/descadastrar?e=${encodeURIComponent(email)}&s=${s}`;
  return json({ ok: true, email, url: page, fluxos_sem_assinatura: `https://templum.com.br/emails/descadastrar?e={{email}}` });
}

// POST /api/email-opt-out  { email, s? }
async function handleEmailOptOut(request, env) {
  let body = {};
  try {
    body = await request.json();
  } catch (_) {
    body = {};
  }
  const url = new URL(request.url);
  const email = normalizeEmail(body.email || url.searchParams.get("e"));
  const sig = String(body.s || url.searchParams.get("s") || "").trim();
  if (!email.includes("@")) return json({ ok: false, error: "invalid_email" }, 400);
  if (!(await verifyOptOutSig(env, email, sig))) {
    return json({ ok: false, error: "invalid_link" }, 403);
  }

  const token = env.ORBIT_CRM_API_KEY;
  let crm = { tagged: [], errors: [], found: 0 };
  if (token) {
    const leads = await crmSearchLeadsByEmail(token, email);
    const tagged = await tagCrmLeadsOptOut(token, leads);
    crm = { found: leads.length, ...tagged };
  }

  const mailchimp = await unsubMailchimp(email, env);

  return json({
    ok: true,
    tag: EMAIL_OPT_OUT_TAG,
    crm,
    mailchimp,
  });
}

function leadHasOptOut(lead) {
  return (lead.tags || []).map((t) => String(t).toLowerCase()).includes(EMAIL_OPT_OUT_TAG);
}

// GET/POST /api/email-opt-out/status — o Fluxo consulta isto ANTES de cada envio.
// 200 = pode mandar. 409 = tem email-opt-out, o passo webhook falha e o fluxo para.
async function handleEmailOptOutStatus(request, env) {
  let body = {};
  if (request.method === "POST") {
    try {
      body = await request.json();
    } catch (_) {
      body = {};
    }
  }
  const url = new URL(request.url);
  const email = normalizeEmail(
    body.email || body.email_alt || body.contact_email || url.searchParams.get("e") || url.searchParams.get("email"),
  );
  const leadId = String(body.lead_id || body.id || url.searchParams.get("lead_id") || "").trim();
  const token = env.ORBIT_CRM_API_KEY;
  if (!token) return json({ ok: false, error: "not_configured" }, 500);

  try {
    let leads = [];
    if (email.includes("@")) {
      leads = await crmSearchLeadsByEmail(token, email);
    } else if (leadId) {
      const r = await fetch(`${ORBIT_BASE}/leads/${leadId}`, {
        headers: { authorization: "Bearer " + token, accept: "application/json" },
      });
      if (r.ok) {
        const j = await r.json().catch(() => ({}));
        const one = j.data || j.lead || j;
        if (one && one.id) leads = [one];
      }
    } else {
      return json({ ok: true, allowed: true, skipped: true, reason: "no_email" });
    }
    if (leads.some(leadHasOptOut)) {
      return json({ ok: true, allowed: false }, 409);
    }
    return json({ ok: true, allowed: true });
  } catch (e) {
    return json({ ok: false, error: "fetch_failed" }, 500);
  }
}
