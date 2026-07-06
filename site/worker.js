// Worker da Templum v3 — serve arquivos estáticos (dist) e expõe:
//   POST /api/lead   → salva lead no Supabase + Mailchimp + Pipedrive (em paralelo)
//   POST /api/track  → envia eventos ao Meta Conversions API (CAPI), server-side
//   GET    /api/leads → leitura interna de leads (senha protegida)
//   DELETE /api/leads → exclui um lead no Supabase por id (senha protegida)
//
// Secrets/vars (Cloudflare → Worker → Settings → Variables and Secrets):
//   SUPABASE_URL           (opcional) default já no código
//   SUPABASE_ANON_KEY      (SECRETO) chave anon do Supabase
//   SUPABASE_SERVICE_KEY   (SECRETO) chave service role — necessária para GET /api/leads
//   MAILCHIMP_API_KEY      ex.: abc123...-us21
//   MAILCHIMP_LIST_ID      ex.: 1a2b3c4d5e
//   MAILCHIMP_TAG          (opcional) default: site-templum
//   PIPEDRIVE_API_TOKEN    (SECRETO) token da API do Pipedrive
//   LEADS_PASSWORD         senha para GET /api/leads (default: Templum@3321)
//   META_PIXEL_ID          ex.: 4177249519256900 — conta 1
//   META_CAPI_TOKEN        (SECRETO) token CAPI — conta 1
//   META_TEST_EVENT_CODE   (opcional) só para testes
//   META_PIXEL_ID_2        (opcional) 2ª conta Meta
//   META_CAPI_TOKEN_2      (opcional, SECRETO) token CAPI da 2ª conta
//   META_TEST_EVENT_CODE_2 (opcional) 2ª conta
//
// GA4/Google Ads: tratados no navegador (gtag); server-side duplicaria eventos.

const META_API_VERSION = "v21.0";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Rotas de API têm prioridade — ANTES do redirect www, para não perder POST body.
    if (url.pathname === "/api/lead") {
      if (request.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
      return handleLead(request, env, ctx);
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

    // Canônico sem "www": www.templum.com.br/* → templum.com.br/* (301, preserva path+query).
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
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

// Helper: limita o tempo de espera de cada task externa (ms).
// Garante que Promise.all retorna em no máximo `ms` mesmo se uma API travar.
function timed(promise, ms) {
  return Promise.race([
    promise,
    new Promise(function(resolve) { setTimeout(function() { resolve({ timeout: true }); }, ms); }),
  ]);
}

// =====================================================================
// LEAD: 3 destinos independentes — Supabase, Mailchimp, Pipedrive
// =====================================================================

async function handleLead(request, env, ctx) {
  let body = {};
  try { body = await request.json(); } catch (_) { return json({ ok: false, error: "invalid_json" }, 400); }

  const email = (body.email || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return json({ ok: false, error: "invalid_email" }, 422);

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
  };

  const isWebinar = lead.evento.startsWith("webinar") || lead.evento.startsWith("webserie");

  // Estratégia: salva no Supabase primeiro (aguarda, max 3s) e responde ao browser.
  // Mailchimp + Pipedrive + Meta CAPI rodam em background via ctx.waitUntil.
  const supabase = await timed(saveToSupabase(lead, env), 3000);

  const bgTasks = [
    saveToMailchimp(lead, env).catch(() => {}),
    sendMetaLead(lead, env, request).catch(() => {}),
  ];
  if (!isWebinar) bgTasks.push(saveToPipedrive(lead, env).catch(() => {}));

  ctx.waitUntil(Promise.all(bgTasks));

  return json({ ok: true, supabase });
}

// ---- 1) Supabase -------------------------------------------------------
async function saveToSupabase(lead, env) {
  const sbUrl = env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
  const sbKey = env.SUPABASE_ANON_KEY;
  if (!sbKey) return { ok: false, reason: "not_configured" };

  try {
    const r = await fetch(`${sbUrl}/rest/v1/site_leads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "apikey": sbKey,
        "authorization": "Bearer " + sbKey,
        "prefer": "return=minimal",
      },
      body: JSON.stringify({
        nome: lead.nome, email: lead.email, telefone: lead.telefone,
        empresa: lead.empresa, norma: lead.norma, cargo: lead.cargo,
        funcionarios: lead.funcionarios, urgencia: lead.urgencia,
        evento: lead.evento, pagina: lead.pagina,
        utm_source: lead.utm_source, utm_medium: lead.utm_medium,
        utm_campaign: lead.utm_campaign, utm_content: lead.utm_content,
        utm_source_ft: lead.utm_source_ft, utm_medium_ft: lead.utm_medium_ft,
        utm_campaign_ft: lead.utm_campaign_ft,
        gclid: lead.gclid, fbclid: lead.fbclid,
      }),
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
          FUNCIONARI: lead.funcionarios, MENSAGEM: lead.mensagem,
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
              FUNCIONARI: lead.funcionarios, MENSAGEM: lead.mensagem,
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
// Pipeline INBOUND (id=1) → Stage NOVO LEAD (id=218)
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

async function saveToPipedrive(lead, env) {
  const token = env.PIPEDRIVE_API_TOKEN;
  if (!token) return { ok: false, reason: "not_configured" };

  try {
    // 1) Organização (empresa)
    let org_id = null;
    if (lead.empresa) {
      const r = await fetch(`${PD_BASE}/organizations?api_token=${token}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: lead.empresa }),
      }).catch(() => null);
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
      const val = lead[field] || (field === "necessidade" ? lead.mensagem : "");
      if (val) dealBody[key] = val;
    }

    const rd = await fetch(`${PD_BASE}/deals?api_token=${token}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(dealBody),
    }).catch(() => null);

    if (rd && rd.ok) {
      const d = await rd.json().catch(() => ({}));
      return { ok: true, deal_id: d.data?.id };
    }
    const e = rd ? await rd.text().catch(() => "") : "fetch_failed";
    return { ok: false, error: String(e).slice(0, 140) };

  } catch (e) {
    return { ok: false, error: "fetch_failed" };
  }
}

// ---- 4) Meta CAPI — evento Lead server-side --------------------------------
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

  const event = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: `lead-${lead.email}-${Date.now()}`,
    action_source: "website",
    event_source_url: lead.pagina ? `https://templum.com.br${lead.pagina}` : "https://templum.com.br",
    user_data,
    custom_data: {
      norma: lead.norma || "",
      evento: lead.evento || "",
    },
  };

  await Promise.all(accounts.map(async (a) => {
    const body = { data: [event] };
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
      `${sbUrl}/rest/v1/site_leads?select=id,created_at,nome,email,telefone,empresa,norma,cargo,pagina,evento,utm_source,utm_medium,utm_campaign,utm_content,utm_source_ft,utm_campaign_ft,gclid,fbclid&order=created_at.desc&limit=${limit}&offset=${offset}`,
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
  const sbKey = env.SUPABASE_ANON_KEY;
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
