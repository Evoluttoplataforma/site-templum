import assert from "node:assert/strict";
import { sanitizeFormEvento } from "../form-evento.js";

const base = {
  sessao_id: "11111111-1111-4111-8111-111111111111",
  pagina: "/consultoria/iso-27001-lp/",
  norma: "ISO 27001",
  dispositivo: "mobile",
  navegador_app: "Chrome",
  tem_clique_anuncio: true,
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "27001",
};

const visivel = sanitizeFormEvento({ ...base, evento: "form_visivel" });
assert.equal(visivel.evento, "form_visivel");
assert.equal(visivel.tem_clique_anuncio, true);
assert.equal(visivel.dispositivo, "mobile");
assert.equal(visivel.pagina, "/consultoria/iso-27001-lp/");

const validacao = sanitizeFormEvento({ ...base, evento: "erro_validacao", campo: "telefone" });
assert.equal(validacao.campo, "telefone");

const ok = sanitizeFormEvento({
  ...base,
  evento: "envio_ok",
  lead_event_id: "22222222-2222-4222-8222-222222222222",
});
assert.equal(ok.lead_event_id, "22222222-2222-4222-8222-222222222222");

assert.equal(sanitizeFormEvento({ ...base, evento: "clique_qualquer" }), null);

const sujo = sanitizeFormEvento({
  ...base,
  evento: "erro_servidor",
  erro_codigo: "500",
  erro_msg: "falhou para maria@empresa.com tel 11999998888",
  nome: "Maria Silva",
  email: "maria@empresa.com",
  telefone: "11999998888",
  empresa: "Acme Ltda",
  mensagem: "quero certificar",
});
assert.equal(sujo.erro_codigo, "500");
assert.equal(sujo.erro_msg.includes("maria@"), false);
assert.equal(sujo.erro_msg.includes("11999998888"), false);
assert.equal("nome" in sujo, false);
assert.equal("email" in sujo, false);
assert.equal("telefone" in sujo, false);
assert.equal("empresa" in sujo, false);
assert.equal("mensagem" in sujo, false);
assert.equal(JSON.stringify(sujo).includes("Maria"), false);
assert.equal(JSON.stringify(sujo).includes("Acme"), false);

assert.equal(
  sanitizeFormEvento({ ...base, evento: "erro_validacao", campo: "maria@empresa.com" }).campo,
  undefined,
);

assert.equal(
  sanitizeFormEvento({ ...base, evento: "form_inicio", sessao_id: "maria@empresa.com" }).sessao_id,
  undefined,
);

assert.equal(sanitizeFormEvento({ ...base, evento: "whatsapp_clique" }).evento, "whatsapp_clique");
assert.equal(
  sanitizeFormEvento({ ...base, evento: "whatsapp_clique", lead_event_id: "A2B3C4" }).lead_event_id,
  "A2B3C4",
);
assert.equal(
  sanitizeFormEvento({ ...base, evento: "whatsapp_clique", lead_event_id: "A2B3C0" }).lead_event_id,
  undefined,
);
assert.equal(
  sanitizeFormEvento({ ...base, evento: "envio_ok", lead_event_id: "A2B3C4" }).lead_event_id,
  undefined,
);
assert.equal(
  sanitizeFormEvento({ ...base, evento: "erro_turnstile", erro_codigo: "110200" }).erro_codigo,
  "110200",
);

const semResposta = sanitizeFormEvento({ ...base, evento: "envio_sem_resposta", erro_codigo: "15s" });
assert.equal(semResposta.evento, "envio_sem_resposta");
assert.equal(semResposta.erro_codigo, "15s");

const motivo = sanitizeFormEvento({
  ...base,
  evento: "erro_validacao",
  campo: "telefone",
  erro_codigo: "sem_ddd",
  erro_msg: "falta ddd",
});
assert.equal(motivo.campo, "telefone");
assert.equal(motivo.erro_codigo, "sem_ddd");
assert.equal(motivo.erro_msg, "falta ddd");

const cta = sanitizeFormEvento({ ...base, evento: "cta_clique", campo: "topo" });
assert.equal(cta.evento, "cta_clique");
assert.equal(cta.campo, "topo");
assert.equal(sanitizeFormEvento({ ...base, evento: "cta_clique", campo: "rodape" }).campo, undefined);

console.log("form-evento: ok");
