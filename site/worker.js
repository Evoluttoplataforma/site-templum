// Worker da Templum: serve os arquivos estáticos (dist) e expõe:
//   POST /api/lead   → cadastra o lead no Mailchimp
//   POST /api/track  → envia eventos ao Meta Conversions API (CAPI), server-side
// Sem as secrets configuradas, ambos respondem ok sem efeito (não quebram a UX).
//
// Secrets/vars (Settings → Variables and Secrets do Worker):
//   MAILCHIMP_API_KEY      ex.: abc123...-us21   (o datacenter vem após o "-")
//   MAILCHIMP_LIST_ID      ex.: 1a2b3c4d5e       (Audience ID)
//   MAILCHIMP_TAG          (opcional) ex.: site-templum
//   META_PIXEL_ID          ex.: 4177249519256900 (público) — conta 1
//   META_CAPI_TOKEN        (SECRETO) token da Conversions API — conta 1
//   META_TEST_EVENT_CODE   (opcional) ex.: TEST5322 — só p/ testes — conta 1
//   META_PIXEL_ID_2        (opcional) 2ª conta Meta — ex.: 953370546204625
//   META_CAPI_TOKEN_2      (opcional, SECRETO) token CAPI da 2ª conta
//   META_TEST_EVENT_CODE_2 (opcional) ex.: TEST5239 — 2ª conta
//
// O GA4 e o Google Ads são tratados no navegador (gtag via tracking-kit); fazer
// GA4 server-side aqui duplicaria os eventos, por isso não é feito.

const META_API_VERSION = "v21.0";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleLead(request, env);
    }
    if (url.pathname === "/api/track") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleTrack(request, env);
    }

    // tudo o mais = arquivos estáticos (Astro build em ./dist)
    return env.ASSETS.fetch(request);
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function sha256(value) {
  if (!value && value !== 0) return undefined;
  const norm = String(value).trim().toLowerCase();
  if (!norm) return undefined;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(norm));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------------------- Mailchimp ----------------------
async function handleLead(request, env) {
  let body = {};
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "invalid_json" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json({ ok: false, error: "invalid_email" }, 422);

  const apiKey = env.MAILCHIMP_API_KEY;
  const listId = env.MAILCHIMP_LIST_ID;
  if (!apiKey || !listId) return json({ ok: true, configured: false });

  const dc = apiKey.split("-")[1];
  if (!dc) return json({ ok: false, error: "bad_api_key" }, 500);

  const endpoint = `https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`;
  const payload = {
    email_address: email,
    status: "subscribed",
    merge_fields: {
      FNAME: body.nome || "",
      PHONE: body.telefone || "",
      COMPANY: body.empresa || "",
      NORMA: body.norma || "",
      MENSAGEM: body.mensagem || "",
      ORIGEM: body.pagina || body.evento || "site",
    },
    tags: [env.MAILCHIMP_TAG || "site-templum"],
  };

  const resp = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Basic " + btoa("anystring:" + apiKey) },
    body: JSON.stringify(payload),
  });
  if (resp.ok) return json({ ok: true, configured: true });

  const err = await resp.json().catch(() => ({}));
  if (err && err.title === "Member Exists") return json({ ok: true, configured: true, existing: true });
  return json({ ok: false, error: err.title || "mailchimp_error" }, 502);
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
