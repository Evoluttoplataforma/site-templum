// Worker da Templum: serve os arquivos estáticos (dist) e expõe:
//   POST /api/lead   → cadastra o lead no Mailchimp
//   POST /api/track  → envia eventos ao Meta Conversions API (CAPI), server-side
// Sem as secrets configuradas, ambos respondem ok sem efeito (não quebram a UX).
//
// Secrets/vars (Settings → Variables and Secrets do Worker):
//   LEAD_WEBHOOK_URL       URL do webhook (n8n/Make/RD/Zapier) que recebe o lead
//                          completo: { nome,email,telefone,empresa,norma,mensagem,
//                          evento,pagina }. Opcional — pode usar só Mailchimp, só
//                          webhook, ou os dois.
//   MAILCHIMP_API_KEY      ex.: abc123...-us21   (o datacenter vem após o "-")
//   MAILCHIMP_LIST_ID      ex.: 1a2b3c4d5e       (Audience ID)
//   MAILCHIMP_TAG          (opcional) ex.: site-templum
//   META_PIXEL_ID          ex.: 4177249519256900 (público) — conta 1
//   META_CAPI_TOKEN        (SECRETO) token da Conversions API — conta 1
//   META_TEST_EVENT_CODE   (opcional) ex.: TEST5322 — só p/ testes — conta 1
//   META_PIXEL_ID_2        (opcional) 2ª conta Meta — ex.: 4177249519256900
//   META_CAPI_TOKEN_2      (opcional, SECRETO) token CAPI da 2ª conta
//   META_TEST_EVENT_CODE_2 (opcional) ex.: TEST5239 — 2ª conta
//   CRM_ORIGIN             domínio enviado no header Origin p/ o CRM Orbit —
//                          PRECISA estar na allowlist do webform (ex.: https://templum.com.br)
//   CRM_FORM_ID            (opcional) id do webform — default já no código
//   CRM_WEBFORM_URL        (opcional) URL da edge function — default já no código
//   CRM_API_KEY            (opcional, SECRETO) api key do CRM (auth server-side)
//
// O GA4 e o Google Ads são tratados no navegador (gtag via tracking-kit); fazer
// GA4 server-side aqui duplicaria os eventos, por isso não é feito.

const META_API_VERSION = "v21.0";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Canônico sem "www": www.templum.com.br/* → templum.com.br/* (301, preserva path+query).
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

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

// ---------------------- Lead: Webhook + Mailchimp ----------------------
async function handleLead(request, env) {
  let body = {};
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "invalid_json" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json({ ok: false, error: "invalid_email" }, 422);

  // Lead normalizado (vai pro webhook e alimenta os merge fields do Mailchimp).
  const lead = {
    nome: body.nome || "",
    email,
    telefone: body.telefone || "",
    empresa: body.empresa || "",
    norma: body.norma || "",
    cargo: body.cargo || "",
    urgencia: body.urgencia || "",
    funcionarios: body.funcionarios || "",
    mensagem: body.mensagem || "",
    evento: body.evento || "lead",
    pagina: body.pagina || "",
    // IDs de sessão/visitante
    client_id: body.client_id || "",
    session_id: body.session_id || "",
    session_attributes: body.session_attributes || {},
    // Atribuição / tracking — last-touch
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
    // Atribuição / tracking — first-touch (originais)
    utm_source_ft: body.utm_source_ft || "",
    utm_medium_ft: body.utm_medium_ft || "",
    utm_campaign_ft: body.utm_campaign_ft || "",
    utm_term_ft: body.utm_term_ft || "",
    utm_content_ft: body.utm_content_ft || "",
    gclid_ft: body.gclid_ft || "",
    fbclid_ft: body.fbclid_ft || "",
    gbraid_ft: body.gbraid_ft || "",
    wbraid_ft: body.wbraid_ft || "",
    gad_source_ft: body.gad_source_ft || "",
    gad_campaignid_ft: body.gad_campaignid_ft || "",
    msclkid_ft: body.msclkid_ft || "",
    ttclid_ft: body.ttclid_ft || "",
    fbp: body.fbp || "",
    fbc: body.fbc || "",
    referrer: body.referrer || "",
    landing: body.landing || "",
  };

  const tasks = [];
  let configured = false;

  // Eventos de webinar/webserie vão SOMENTE para o Mailchimp (sem CRM nem webhook).
  const isWebinar = lead.evento.startsWith("webinar") || lead.evento.startsWith("webserie");

  // 1) Webhook (n8n / Make / RDStation / Zapier / etc.) — recebe o lead completo.
  if (!isWebinar && env.LEAD_WEBHOOK_URL) {
    configured = true;
    tasks.push(
      fetch(env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(lead),
      }).then((r) => ({ webhook: r.ok })).catch(() => ({ webhook: false }))
    );
  }

  // 2) Mailchimp (opcional) — cadastra/atualiza o contato.
  if (env.MAILCHIMP_API_KEY && env.MAILCHIMP_LIST_ID) {
    configured = true;
    const dc = env.MAILCHIMP_API_KEY.split("-")[1];
    if (dc) {
      const auth = "Basic " + btoa("anystring:" + env.MAILCHIMP_API_KEY);
      const mcBase = `https://${dc}.api.mailchimp.com/3.0/lists/${env.MAILCHIMP_LIST_ID}`;
      const mcTags = [
        env.MAILCHIMP_TAG || "site-templum",
        // Tag dinâmica por evento (ex.: "webserie-iso9001-2026", "aula-iso9001", etc.)
        ...(lead.evento && lead.evento !== "lead" ? [lead.evento] : []),
      ];
      const mc = {
        email_address: email,
        status: "subscribed",
        merge_fields: {
          FNAME: lead.nome, PHONE: lead.telefone, COMPANY: lead.empresa,
          NORMA: lead.norma, CARGO: lead.cargo, URGENCIA: lead.urgencia,
          FUNCIONARI: lead.funcionarios, MENSAGEM: lead.mensagem,
          ORIGEM: lead.pagina || lead.evento || "site",
          UTM_SOURCE: lead.utm_source, UTM_MEDIUM: lead.utm_medium, UTM_CAMP: lead.utm_campaign,
        },
        tags: mcTags,
      };
      tasks.push(
        fetch(`${mcBase}/members`, {
          method: "POST",
          headers: { "content-type": "application/json", authorization: auth },
          body: JSON.stringify(mc),
        }).then(async (r) => {
          if (r.ok) return { mailchimp: true };
          const e = await r.json().catch(() => ({}));
          if (e && e.title === "Member Exists") {
            // Contato já existe — adiciona as tags sem sobrescrever as existentes.
            const hash = md5hex(email);
            const tr = await fetch(`${mcBase}/members/${hash}/tags`, {
              method: "POST",
              headers: { "content-type": "application/json", authorization: auth },
              body: JSON.stringify({ tags: mcTags.map(name => ({ name, status: "active" })) }),
            }).catch(() => null);
            return { mailchimp: true, existing: true, tags_updated: tr?.ok ?? false };
          }
          return { mailchimp: false, error: e.title || "mailchimp_error" };
        }).catch(() => ({ mailchimp: false }))
      );
    }
  }

  // 3) Google Sheets (webinar/webserie) — envia para o Apps Script Web App.
  if (isWebinar && env.WEBSERIE_SHEET_URL) {
    configured = true;
    tasks.push(
      fetch(env.WEBSERIE_SHEET_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          nome: lead.nome, email, telefone: lead.telefone,
          pagina: lead.pagina, evento: lead.evento,
          utm_source: lead.utm_source, utm_medium: lead.utm_medium, utm_campaign: lead.utm_campaign,
        }),
      }).then((r) => ({ sheet: r.ok })).catch(() => ({ sheet: false }))
    );
  }

  // Pulado para webinars (sem CRM nem webhook genérico).
  if (isWebinar) { const results = await Promise.all(tasks); return json({ ok: true, configured, results }); }

  // CRM Orbit/Evolutto (Supabase Edge Function "crm-webform-submit").
  //    O webform é travado por DOMÍNIO (checa Origin/Referer). Como o envio é
  //    server-side, mandamos o Origin de CRM_ORIGIN — esse domínio PRECISA estar
  //    na allowlist do webform no CRM, senão volta 403 "Domain not allowed".
  //    CRM_API_KEY (secret, opcional) é enviado junto p/ o caso de auth por chave.
  const crmUrl = env.CRM_WEBFORM_URL || "https://cvanwvoddchatcdstwry.supabase.co/functions/v1/crm-webform-submit";
  const crmFormId = env.CRM_FORM_ID || "933f0ed2-a158-41d0-bcdf-6377e342f826";
  const crmOrigin = env.CRM_ORIGIN || "https://templum.com.br";
  if (crmUrl && (crmFormId || env.CRM_API_KEY)) {
    configured = true;
    const cf = {};
    const put = (k, v) => { if (v) cf[k] = v; };
    put("cf_utm_source", lead.utm_source); put("cf_utm_medium", lead.utm_medium);
    put("cf_utm_campaign", lead.utm_campaign); put("cf_utm_term", lead.utm_term);
    put("cf_utm_content", lead.utm_content);
    put("cf_first_touch_utm_source", lead.utm_source_ft); put("cf_first_touch_utm_medium", lead.utm_medium_ft);
    put("cf_first_touch_utm_campaign", lead.utm_campaign_ft); put("cf_first_touch_utm_term", lead.utm_term_ft);
    put("cf_first_touch_utm_content", lead.utm_content_ft);
    put("cf_fbclid", lead.fbclid); put("cf_facebook_browser_id_fbp", lead.fbp); put("cf_facebook_click_id_fbc", lead.fbc);
    put("cf_gclid", lead.gclid); put("cf_gad_source", lead.gad_source); put("cf_gad_campaignid", lead.gad_campaignid);
    put("cf_gbraid", lead.gbraid); put("cf_msclkid", lead.msclkid); put("cf_ttclid", lead.ttclid);
    put("cf_id_da_sess_o", lead.session_id); put("cf_landing_page", lead.landing);
    put("cf_faixa_de_funcion_rios", lead.funcionarios); put("cf_cargo", lead.cargo);
    const crmBody = { name: lead.nome, email, phone: lead.telefone, company: lead.empresa, custom_fields: cf };
    if (crmFormId) crmBody.form_id = crmFormId;
    if (env.CRM_API_KEY) crmBody.api_key = env.CRM_API_KEY;
    tasks.push(
      fetch(crmUrl, {
        method: "POST",
        headers: { "content-type": "application/json", origin: crmOrigin, referer: crmOrigin + "/" },
        body: JSON.stringify(crmBody),
      }).then(async (r) => {
        if (r.ok) return { crm: true };
        const e = await r.text().catch(() => "");
        return { crm: false, status: r.status, error: e.slice(0, 140) };
      }).catch(() => ({ crm: false }))
    );
  }

  const results = await Promise.all(tasks);
  return json({ ok: true, configured, results });
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
