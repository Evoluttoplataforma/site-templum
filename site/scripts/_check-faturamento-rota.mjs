import fs from "node:fs";

const src = fs.readFileSync(new URL("../worker.js", import.meta.url), "utf8");

function grab(start, end) {
  const i = src.indexOf(start);
  const j = src.indexOf(end, i + start.length);
  if (i < 0 || j < 0) throw new Error("trecho ausente: " + start);
  return src.slice(i, j);
}

const code = [
  "const LP_ISO9001_V2_PATH = \"/consultoria/iso-9001-lp-v2/\";",
  grab("function pathOnly(", "function isBlogPath("),
  grab("function normLpPath(", "/** LP de consultoria"),
  grab("const FATURAMENTO_SPLIT_LPS", "function faturamentoMqlTags("),
  "return { isFaturamentoMql, isFaturamentoInbound, faturamentoSplitCfg };",
].join("\n");

const api = new Function(code)();

function destino(pagina, faturamento) {
  const lead = { pagina, faturamento };
  if (String(pagina || "").includes("iso-9001-lp-v2")) return "teste-igor-piloto";
  if (api.isFaturamentoMql(lead)) return "mql";
  if (api.isFaturamentoInbound(lead)) return "inbound";
  return "inbound";
}

const casos = [
  ["/consultoria/pbqp-h-lp-v2/", "Até R$ 50 mil", "mql"],
  ["/consultoria/pbqp-h-lp-v2/", "R$ 50 mil a R$ 100 mil", "mql"],
  ["/consultoria/pbqp-h-lp-v2/", "R$ 100 mil a R$ 300 mil", "inbound"],
  ["/consultoria/pbqp-h-lp-v2/", "R$ 300 mil a R$ 500 mil", "inbound"],
  ["/consultoria/pbqp-h-lp-v2/", "R$ 500 mil a R$ 1 milhão", "inbound"],
  ["/consultoria/pbqp-h-lp-v2/", "Acima de R$ 1 milhão", "inbound"],
  ["/consultoria/pbqp-h-lp-v2/", "", "mql"],
  ["https://templum.com.br/consultoria/pbqp-h-lp-v2/?utm_source=ads", "Até R$ 50 mil", "mql"],
  ["/consultoria/pbqp-h-lp/", "Até R$ 50 mil", "inbound"],
  ["/consultoria/pbqp-h-lp/", "Acima de R$ 1 milhão", "inbound"],
  ["/consultoria/iso-9001-lp-v2/", "R$ 50 mil a R$ 100 mil", "teste-igor-piloto"],
  ["/consultoria/iso-9001-lp-v2/", "R$ 100 mil a R$ 300 mil", "teste-igor-piloto"],
  ["/iso-9001-advocacia-v2/", "Até R$ 100 mil", "mql"],
  ["/iso-9001-advocacia-v2/", "De R$ 100 mil a R$ 500 mil", "inbound"],
  ["/consultoria/iso-27001-lp-v2/", "Até R$ 50 mil", "mql"],
  ["/consultoria/iso-27001-lp-v2/", "R$ 50 mil a R$ 100 mil", "mql"],
  ["/consultoria/iso-27001-lp-v2/", "R$ 100 mil a R$ 300 mil", "inbound"],
  ["/consultoria/iso-27001-lp-v2/", "Acima de R$ 1 milhão", "inbound"],
  ["https://templum.com.br/consultoria/iso-27001-lp-v2/", "R$ 50 mil a R$ 100 mil", "mql"],
];

let falhou = false;
for (const [pagina, faixa, esperado] of casos) {
  const got = destino(pagina, faixa);
  const ok = got === esperado;
  if (!ok) falhou = true;
  console.log(`${ok ? "ok" : "FALHOU"} ${pagina} | ${faixa || "(vazio)"} → ${got}`);
}

const cfg = api.faturamentoSplitCfg({ pagina: "/consultoria/pbqp-h-lp-v2/" });
if (!cfg || cfg.tag !== "pbqph-ate-100mil" || cfg.source !== "LP PBQP-H") {
  falhou = true;
  console.log("FALHOU cfg", cfg);
} else {
  console.log("ok cfg", JSON.stringify(cfg));
}

const campCode = [
  grab("function pathOnly(", "function isBlogPath("),
  grab("function normLpPath(", "/** LP de consultoria"),
  grab("function applyConsultoriaLpCampaign(", "function applySegmentLpUtmDefaults("),
  "return { applyConsultoriaLpCampaign };",
].join("\n");
const camp = new Function(campCode)();

function atribuicao(pagina, body) {
  const lead = {
    evento: "lead",
    pagina,
    utm_source: "email",
    utm_medium: "crm",
    utm_campaign: "pos-live-requisitos-2110",
    utm_term: "iso 27001",
    utm_content: "199625163506",
    gclid: "TESTE_WPP",
    gbraid: "0AAAAABCqyvql30nu6OuZ1qSzJeoKcohX6",
  };
  camp.applyConsultoriaLpCampaign(lead, body);
  return lead;
}

const herdado = atribuicao("/consultoria/pbqp-h-lp-v2/", {});
const limpo = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "gbraid"]
  .every((k) => herdado[k] === "");
if (!limpo) {
  falhou = true;
  console.log("FALHOU heranca", herdado);
} else {
  console.log("ok v2 sem utm na url limpa campanha e clique herdados");
}

const daUrl = atribuicao("https://templum.com.br/consultoria/pbqp-h-lp-v2/?utm_source=ads", {
  utm_from_url: true,
  utm_source: "google",
  utm_medium: "cpc",
  utm_campaign: "pbqp-h",
  utm_term: "pbqp",
  utm_content: "",
  click_from_url: true,
});
if (daUrl.utm_source !== "google" || daUrl.utm_campaign !== "pbqp-h" || daUrl.utm_term !== "pbqp" || daUrl.gclid !== "TESTE_WPP") {
  falhou = true;
  console.log("FALHOU utm da url", daUrl);
} else {
  console.log("ok v2 com utm na url mantem o que veio na url");
}

const ads = atribuicao("/consultoria/pbqp-h-lp/", {});
if (ads.utm_campaign !== "" || ads.utm_term !== "" || ads.gclid !== "") {
  falhou = true;
  console.log("FALHOU ads", ads);
} else {
  console.log("ok lp de anuncio tambem nao herda campanha de outra pagina");
}

if (falhou) process.exit(1);
console.log("rota ok");
