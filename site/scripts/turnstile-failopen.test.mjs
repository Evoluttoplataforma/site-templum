import assert from "node:assert/strict";

const store = new Map();
globalThis.caches = {
  default: {
    async match(req) {
      const hit = store.get(req.url);
      return hit ? new Response(hit) : undefined;
    },
    async put(req, res) {
      store.set(req.url, await res.text());
    },
  },
};

const calls = [];
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  const body = opts && opts.body ? String(opts.body) : "";
  calls.push({ url: u, body });
  if (u.includes("siteverify")) {
    const sent = JSON.parse(body);
    const success = sent.response === "token-ok";
    return new Response(JSON.stringify({
      success,
      "error-codes": success ? [] : ["invalid-input-response"],
    }), { status: 200 });
  }
  return new Response("{}", { status: 201 });
};

const { handleLead } = await import("../worker.js");

const env = {
  TURNSTILE_SECRET_KEY: "secret",
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_SERVICE_KEY: "svc",
  META_PIXEL_ID: "1",
  META_CAPI_TOKEN: "meta",
};

function ctx() {
  const jobs = [];
  return {
    jobs,
    waitUntil(p) { jobs.push(Promise.resolve(p)); },
  };
}

function leadRequest(body, ip) {
  return new Request("https://templum.com.br/api/lead", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": ip },
    body: JSON.stringify(body),
  });
}

function savedBodies() {
  return calls
    .filter((c) => c.url.includes("/rest/v1/site_leads"))
    .map((c) => JSON.parse(c.body));
}

function metaCalls() {
  return calls.filter((c) => c.url.includes("graph.facebook.com"));
}

const base = {
  nome: "Ana Teste",
  email: "ana.failopen@example.com",
  telefone: "11999990000",
  empresa: "Teste",
  norma: "ISO 9001",
  evento: "lead",
  pagina: "/consultoria/iso-9001-lp-v3/",
  mensagem: "Pedido de proposta",
};

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    turnstile_token: "",
    turnstile_status: "timeout",
    form_age_ms: 4000,
    website: "",
  }, "1.1.1.1"), env, c);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.turnstile, "nao_verificado");
  assert.equal(json.supabase.ok, true);
  const row = savedBodies().at(-1);
  assert.equal(row.mensagem.startsWith("[nao_verificado:timeout]"), true);
  await Promise.all(c.jobs);
  assert.equal(metaCalls().length, 0);
}

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    email: "cedo@example.com",
    turnstile_token: "",
    turnstile_status: "timeout",
    form_age_ms: 1000,
  }, "1.1.1.2"), env, c);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error, "too_fast");
  assert.equal(savedBodies().length, 0);
}

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    email: "bot@example.com",
    turnstile_token: "token-ok",
    form_age_ms: 9000,
    website: "http://spam.example",
  }, "1.1.1.3"), env, c);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error, "honeypot");
  assert.equal(savedBodies().length, 0);
  assert.equal(calls.some((item) => item.url.includes("siteverify")), false);
}

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    email: "ok@example.com",
    turnstile_token: "token-ok",
    turnstile_status: "ok",
    form_age_ms: 9000,
  }, "1.1.1.4"), env, c);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.turnstile, "ok");
  const row = savedBodies().at(-1);
  assert.equal(row.mensagem.includes("nao_verificado"), false);
  await Promise.all(c.jobs);
  assert.equal(metaCalls().length > 0, true);
}

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    email: "recusa@example.com",
    turnstile_token: "",
    turnstile_status: "erro_600010",
    form_age_ms: 8000,
  }, "2.2.2.1"), env, c);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error, "turnstile");
  assert.equal(savedBodies().length, 0);
}

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    email: "dominio@example.com",
    turnstile_token: "",
    turnstile_status: "erro_110200",
    form_age_ms: 8000,
  }, "2.2.2.2"), env, c);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.turnstile, "nao_verificado");
  assert.equal(savedBodies().at(-1).mensagem.startsWith("[nao_verificado:erro_110200]"), true);
}

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    email: "widget@example.com",
    turnstile_token: "",
    turnstile_status: "erro_200100",
    form_age_ms: 8000,
  }, "2.2.2.3"), env, c);
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.turnstile, "nao_verificado");
}

{
  calls.length = 0;
  const c = ctx();
  const res = await handleLead(leadRequest({
    ...base,
    email: "outro@example.com",
    turnstile_token: "",
    turnstile_status: "erro_300010",
    form_age_ms: 8000,
  }, "2.2.2.4"), env, c);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error, "turnstile");
  assert.equal(savedBodies().length, 0);
}

{
  calls.length = 0;
  const c = ctx();
  const estrito = Object.assign({}, env, { TURNSTILE_ESTRITO: "1" });
  const res = await handleLead(leadRequest({
    ...base,
    email: "estrito@example.com",
    turnstile_token: "",
    turnstile_status: "timeout",
    form_age_ms: 8000,
  }, "2.2.2.5"), estrito, c);
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.error, "turnstile");
  assert.equal(savedBodies().length, 0);
}

{
  calls.length = 0;
  for (let i = 0; i < 5; i++) {
    const c = ctx();
    const res = await handleLead(leadRequest({
      ...base,
      email: "rajada" + i + "@example.com",
      turnstile_token: "token-ok",
      form_age_ms: 9000,
    }, "9.9.9.9"), env, c);
    assert.equal(res.status, 200);
    await Promise.all(c.jobs);
  }
  const blocked = await handleLead(leadRequest({
    ...base,
    email: "rajada6@example.com",
    turnstile_token: "token-ok",
    form_age_ms: 9000,
  }, "9.9.9.9"), env, ctx());
  const json = await blocked.json();
  assert.equal(blocked.status, 429);
  assert.equal(json.error, "rate_limit");
}

console.log("turnstile fail-open ok");
