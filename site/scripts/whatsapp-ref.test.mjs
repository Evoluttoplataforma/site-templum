import assert from "node:assert/strict";
import { sanitizeWhatsappRef } from "../whatsapp-ref.js";

const ok = sanitizeWhatsappRef({
  ref: "K7NP2Q",
  pagina: "/consultoria/iso-27001-lp/?gclid=TESTE_WPP",
  norma: "ISO 27001",
  dispositivo: "mobile",
  sessao_id: "11111111-1111-4111-8111-111111111111",
  gclid: "TESTE_WPP",
  gbraid: "",
  wbraid: "",
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "27001",
  utm_term: "iso 27001",
  nome: "Maria",
  email: "maria@empresa.com",
  telefone: "11999998888",
  empresa: "Acme",
});

assert.equal(ok.ref, "K7NP2Q");
assert.equal(ok.pagina, "/consultoria/iso-27001-lp/");
assert.equal(ok.norma, "ISO 27001");
assert.equal(ok.dispositivo, "mobile");
assert.equal(ok.gclid, "TESTE_WPP");
assert.equal(ok.utm_term, "iso 27001");
assert.equal("nome" in ok, false);
assert.equal("email" in ok, false);
assert.equal("telefone" in ok, false);
assert.equal("empresa" in ok, false);
assert.equal(JSON.stringify(ok).includes("Maria"), false);
assert.equal(JSON.stringify(ok).includes("Acme"), false);

assert.equal(sanitizeWhatsappRef({ ref: "K7NP20" }), null);
assert.equal(sanitizeWhatsappRef({ ref: "ABCDEF" }).ref, "ABCDEF");
assert.equal(sanitizeWhatsappRef({ ref: "K7NP2Q", gclid: "maria@empresa.com" }).gclid, undefined);
assert.equal(sanitizeWhatsappRef({ ref: "K7NP2Q", norma: "SASSMAQ 4.0" }).norma, "SASSMAQ 4.0");

console.log("whatsapp-ref: ok");
