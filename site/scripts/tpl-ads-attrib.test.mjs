import assert from "node:assert/strict";
import fs from "fs";
import vm from "vm";

function boot(url, store, cookies) {
  const jar = { value: cookies || "" };
  const local = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const document = {
    get cookie() { return jar.value; },
    set cookie(v) {
      const [pair] = String(v).split(";");
      const i = pair.indexOf("=");
      const name = pair.slice(0, i);
      const val = pair.slice(i + 1);
      const parts = jar.value ? jar.value.split("; ").filter((p) => p && !p.startsWith(name + "=")) : [];
      if (!/Max-Age=0/.test(v)) parts.push(name + "=" + val);
      jar.value = parts.join("; ");
    },
  };
  const context = {
    URLSearchParams,
    encodeURIComponent,
    decodeURIComponent,
    Date,
    JSON,
    Math,
    location: new URL(url),
    document,
    localStorage: local,
    window: {},
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL("./../public/js/tpl-ads-attrib.js", import.meta.url), "utf8"), context);
  return { context, jar, store };
}

const store = {};
const a = boot("https://templum.com.br/ab/iso-9001-novembro-certificacao/?gclid=TESTE_PERSIST&modo_teste=1", store);
const primeiro = a.context.tplAdsAttrib();
assert.equal(primeiro.gclid, "TESTE_PERSIST");
assert.equal(primeiro.origem_clique, "url");
assert.equal(primeiro.modo_teste, true);

const b = boot("https://templum.com.br/ab/iso-9001-novembro-certificacao/", store);
const segundo = b.context.tplAdsAttrib();
assert.equal(segundo.gclid, "TESTE_PERSIST");
assert.equal(segundo.origem_clique, "guardado");
assert.equal(segundo.modo_teste, true);

store.tpl_ads_attrib = JSON.stringify({
  t: Date.now(),
  origem: "url",
  gclid: "CLIQUE_PAGO",
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "iso",
});
const c = boot("https://templum.com.br/ab/iso-9001-novembro-certificacao/?utm_source=google&utm_medium=organic", store);
const organico = c.context.tplAdsAttrib();
assert.equal(organico.gclid, "CLIQUE_PAGO");
assert.equal(organico.utm_medium, "cpc");
assert.equal(organico.origem_clique, "guardado");

const d = boot("https://templum.com.br/consultoria/iso-9001-lp-v3/?gclid=NOVO_CLIQUE&utm_medium=cpc", store);
const novo = d.context.tplAdsAttrib();
assert.equal(novo.gclid, "NOVO_CLIQUE");
assert.equal(novo.origem_clique, "url");
assert.equal(novo.utm_medium, "cpc");

const vazio = {};
const ts = Math.floor(Date.now() / 1000) - 3600;
const e = boot("https://templum.com.br/ab/x/", vazio, "_gcl_aw=" + encodeURIComponent("GCL." + ts + ".COOKIECLIQUE"));
const cookie = e.context.tplAdsAttrib();
assert.equal(cookie.gclid, "COOKIECLIQUE");
assert.equal(cookie.origem_clique, "cookie_google");

console.log("tpl-ads-attrib: ok");
