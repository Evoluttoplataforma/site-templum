import assert from "node:assert/strict";
import { sanitizeFormEvento } from "../form-evento.js";
import {
  H1_EXPERIMENTOS,
  configCliente,
} from "../src/data/h1-experimentos.js";
import {
  aplicarNoDocumento,
  camposH1,
  clientJs,
  gravarAtribuicao,
  leadEhTesteH1,
  lerAtribuicao,
  notaH1,
  parseQa,
  resolver,
  textoDe,
} from "../h1-experimento.js";

function loja() {
  const local = new Map();
  const sessao = new Map();
  let localLiga = true;
  let sessaoLiga = true;
  const win = {
    __tplH1Mem: {},
    location: { search: "", pathname: "/consultoria/iso-9001-lp/" },
    navigator: {},
    innerWidth: 1280,
    localStorage: {
      getItem(k) {
        if (!localLiga) throw new Error("local");
        return local.has(k) ? local.get(k) : null;
      },
      setItem(k, v) {
        if (!localLiga) throw new Error("local");
        local.set(k, v);
      },
    },
    sessionStorage: {
      getItem(k) {
        if (!sessaoLiga) throw new Error("sessao");
        return sessao.has(k) ? sessao.get(k) : null;
      },
      setItem(k, v) {
        if (!sessaoLiga) throw new Error("sessao");
        sessao.set(k, v);
      },
    },
    fetch() {
      return Promise.resolve({ ok: true });
    },
  };
  return {
    win,
    local,
    sessao,
    cortarLocal() { localLiga = false; },
    cortarSessao() { sessaoLiga = false; },
  };
}

function ambiente(box, search, random) {
  box.win.location.search = search || "";
  return {
    search: box.win.location.search,
    random: random || (() => 0),
    ler: (chave) => lerAtribuicao(box.win, chave),
    gravar: (chave, atribuicao) => gravarAtribuicao(box.win, chave, atribuicao),
  };
}

function documento(texto) {
  const h1 = {
    text: texto,
    children: [],
    get firstChild() { return this.children[0] || null; },
    removeChild() { this.children.shift(); this.text = this.children.map((n) => n.textContent || "").join(""); },
    appendChild(node) {
      this.children.push(node);
      this.text = this.children.map((n) => n.textContent || "").join("");
    },
    get textContent() { return this.text; },
  };
  return {
    h1,
    getElementById(id) { return id === "tpl-h1" ? h1 : null; },
    createTextNode(value) { return { textContent: String(value) }; },
    createElement() {
      const el = {
        className: "",
        children: [],
        appendChild(node) { this.children.push(node); },
        get textContent() { return this.children.map((n) => n.textContent || "").join(""); },
      };
      return el;
    },
    documentElement: { classList: { remove() {} } },
  };
}

const iso = configCliente(H1_EXPERIMENTOS.iso9001);
const pbqp = configCliente(H1_EXPERIMENTOS.pbqph);

assert.equal(parseQa("?h1=3"), 3);
assert.equal(parseQa("?h1=0"), null);
assert.equal(parseQa("?h1=6"), 6);
assert.equal(parseQa("?h1=7"), null);
assert.equal(parseQa("?h1=foo"), null);
assert.equal(parseQa("?h1=1.5"), null);
assert.equal(parseQa(""), null);

const limites = [0, 0.2, 0.4, 0.6, 0.8, 0.999999];
const esperados = [1, 2, 3, 4, 5, 5];
limites.forEach((n, i) => {
  const box = loja();
  const r = resolver(iso, ambiente(box, "", () => n));
  assert.equal(r.atribuida.variante, esperados[i]);
  assert.equal(r.modo_teste, false);
});

{
  const box = loja();
  const primeiro = resolver(iso, ambiente(box, "", () => 0.41));
  const segundo = resolver(iso, ambiente(box, "", () => 0.9));
  assert.equal(primeiro.atribuida.variante, 3);
  assert.equal(segundo.atribuida.variante, 3);
  assert.equal(box.local.has("tpl_variante_h1"), false);
  assert.equal(JSON.parse(box.local.get("tpl_h1_iso9001_r01")).v, 3);
}

{
  const box = loja();
  resolver(iso, ambiente(box, "", () => 0.21));
  resolver(pbqp, ambiente(box, "", () => 0.81));
  assert.equal(JSON.parse(box.local.get("tpl_h1_iso9001_r01")).v, 2);
  assert.equal(JSON.parse(box.local.get("tpl_h1_pbqph_r02")).v, 5);
}

{
  const box = loja();
  const sexta = resolver(pbqp, ambiente(box, "", () => 0.99));
  assert.equal(sexta.atribuida.variante, 6);
  assert.equal(sexta.atribuida.angulo, "metodo");
  assert.equal(JSON.parse(box.local.get("tpl_h1_pbqph_r02")).v, 6);
}

{
  const box = loja();
  resolver(iso, ambiente(box, "", () => 0.21));
  const qa = resolver(iso, ambiente(box, "?h1=5", () => 0));
  assert.equal(qa.modo_teste, true);
  assert.equal(qa.atribuida.variante, 2);
  assert.equal(qa.atribuida.angulo, "exigencia");
  assert.equal(qa.exposta.n, 5);
  assert.equal(qa.exposta.angulo, "metodo");
  assert.equal(JSON.parse(box.local.get("tpl_h1_iso9001_r01")).v, 2);
}

{
  const box = loja();
  const qa = resolver(iso, ambiente(box, "?h1=4", () => 0));
  assert.equal(qa.atribuida, null);
  assert.equal(qa.exposta.n, 4);
  assert.equal(box.local.size, 0);
}

{
  const box = loja();
  const ruim = resolver(iso, ambiente(box, "?h1=9", () => 0.61));
  assert.equal(ruim.modo_teste, false);
  assert.equal(ruim.atribuida.variante, 4);
}

{
  const parado = { ...iso, estado: "inativo" };
  const box = loja();
  const r = resolver(parado, ambiente(box, "", () => 0.9));
  assert.equal(r.medir, false);
  assert.equal(r.trocar, false);
  assert.equal(box.local.size, 0);
  const qa = resolver(parado, ambiente(box, "?h1=2", () => 0));
  assert.equal(qa.modo_teste, true);
  assert.equal(qa.exposta.n, 2);
  assert.equal(box.local.size, 0);
}

{
  const fim = { ...iso, estado: "encerrado", variante_fixa: 4 };
  const box = loja();
  const r = resolver(fim, ambiente(box, "", () => 0));
  assert.equal(r.atribuida.variante, 4);
  assert.equal(r.atribuida.angulo, "proposta");
  assert.equal(r.exposta.n, 4);
  assert.equal(r.persistencia, "fixa");
  assert.equal(box.local.size, 0);
  const qa = resolver(fim, ambiente(box, "?h1=1", () => 0));
  assert.equal(qa.exposta.n, 1);
  assert.equal(qa.atribuida.variante, 4);
}

{
  const box = loja();
  box.cortarLocal();
  const r = resolver(iso, ambiente(box, "", () => 0.61));
  assert.equal(r.persistencia, "sessao");
  assert.equal(r.atribuida.variante, 4);
  const deNovo = resolver(iso, ambiente(box, "", () => 0));
  assert.equal(deNovo.atribuida.variante, 4);
}

{
  const box = loja();
  box.cortarLocal();
  box.cortarSessao();
  const r = resolver(iso, ambiente(box, "", () => 0.81));
  assert.equal(r.persistencia, "memoria");
  assert.equal(r.atribuida.variante, 5);
  const deNovo = resolver(iso, ambiente(box, "", () => 0));
  assert.equal(deNovo.atribuida.variante, 5);
  assert.equal(deNovo.persistencia, "memoria");
}

{
  const controle = textoDe(iso.variantes[0]);
  const box = loja();
  gravarAtribuicao(box.win, iso.experimento_id, { variante: 1, angulo: "controle" });
  const doc = documento(controle);
  const aplicado = aplicarNoDocumento(doc, box.win, iso);
  assert.equal(aplicado.falha, "");
  assert.equal(aplicado.expostaEfetiva.n, 1);
  assert.equal(doc.h1.textContent, controle);
}

{
  const box = loja();
  box.win.location.search = "";
  gravarAtribuicao(box.win, iso.experimento_id, { variante: 2, angulo: "exigencia" });
  const doc = documento(textoDe(iso.variantes[0]));
  const aplicado = aplicarNoDocumento(doc, box.win, iso);
  assert.equal(aplicado.expostaEfetiva.n, 2);
  assert.equal(doc.h1.textContent.includes("Prepare sua empresa com a Templum"), true);
  assert.equal(doc.h1.children.some((n) => n.className === "cs-hl"), true);
}

{
  const box = loja();
  const parado = aplicarNoDocumento(documento("texto que nao e o controle"), box.win, { ...iso, estado: "inativo" });
  assert.equal(parado.medir, false);
  gravarAtribuicao(box.win, iso.experimento_id, { variante: 1, angulo: "controle" });
  const rodando = aplicarNoDocumento(documento("texto divergente"), box.win, iso);
  assert.equal(rodando.falha, "diverge");
  assert.equal(rodando.expostaEfetiva, null);
  assert.equal(rodando.medicao.variante_exposta, "");
  assert.equal(rodando.medicao.h1_falha, "diverge");
  assert.equal(rodando.medicao.variante_h1, 1);
}

{
  const js = clientJs();
  assert.equal(js.includes("</script>"), false);
  const box = loja();
  const doc = documento(textoDe(iso.variantes[0]));
  globalThis.window = box.win;
  globalThis.document = doc;
  new Function(js)();
  assert.equal(typeof box.win.tplH1Aplicar, "function");
  box.win.__TPL_H1_CONFIG = iso;
  box.win.tplH1Aplicar();
  assert.equal(box.win.__tplH1.medicao.experimento_id, "tpl_h1_iso9001_r01");
  assert.equal(box.win.__tplH1.medicao.lp_id, "iso9001");
}

for (const exp of Object.values(H1_EXPERIMENTOS)) {
  assert.equal(exp.variantes.length, exp.lp_id === "pbqph" || exp.lp_id === "pbqphv2" || exp.lp_id === "iso9001v2" || exp.lp_id === "iso27001v2" ? 6 : 5);
  assert.equal(exp.estado, "em_execucao");
  for (const item of exp.variantes) {
    const texto = textoDe(item);
    assert.equal(/diagn[oó]stico|cronograma/i.test(texto), false, texto);
    const controleComTravo = exp.lp_id === "iso27001" && item.n === 1;
    if (!controleComTravo) {
      assert.equal(texto.includes("\u2014") || texto.includes("\u2013"), false, texto);
    }
  }
}

assert.equal(textoDe(H1_EXPERIMENTOS.iso27001.variantes[0]).startsWith("Da proposta à certificação ISO 27001"), true);
assert.deepEqual(H1_EXPERIMENTOS.iso9001v2.variantes.map(textoDe), [
  "Implemente a ISO 9001 ou receba 200% do seu investimento de volta.",
  "Seus clientes estão exigindo a ISO 9001? Prepare sua empresa para atender.",
  "Sua empresa está pronta para conquistar novos contratos que exigem a ISO 9001?",
  "Quanto o retrabalho está custando à sua empresa? A ISO 9001 pode ajudar a mudar isso.",
  "Sua empresa depende de você para tudo? Comece a mudar isso com a ISO 9001.",
  "Sua empresa precisa da ISO 9001, mas falta tempo para cuidar da implementação?",
]);
assert.deepEqual(H1_EXPERIMENTOS.pbqphv2.variantes.map(textoDe), H1_EXPERIMENTOS.pbqph.variantes.map(textoDe));
assert.equal(H1_EXPERIMENTOS.pbqphv2.experimento_id, "tpl_h1_pbqphv2_r01");
assert.deepEqual(H1_EXPERIMENTOS.pbqph.variantes.map(textoDe), [
  "Certifique sua construtora no PBQP-H ou receba 200% do valor investido de volta",
  "Sua construtora pode estar a um passo de novas oportunidades com o PBQP-H.",
  "Sua construtora quer crescer? Prepare-se para novas oportunidades com o PBQP-H.",
  "Conquistar o PBQP-H não precisa ser mais uma complicação na sua obra.",
  "Sua construtora precisa do PBQP-H, mas falta tempo para cuidar da implementação?",
  "Novos contratos podem exigir o PBQP-H. Sua construtora está preparada?",
]);
assert.equal(H1_EXPERIMENTOS.iso27001v2.experimento_id, "tpl_h1_iso27001v2_r03");
assert.deepEqual(H1_EXPERIMENTOS.iso27001v2.variantes.map(textoDe), [
  "Seus clientes exigem a ISO 27001? Prepare sua empresa.",
  "Sem comprovar a segurança, sua empresa pode perder contratos.",
  "Um vazamento de dados abala a confiança dos seus clientes.",
  "Quem acessa os dados críticos da sua empresa?",
  "O cliente pediu a ISO 27001. Sua empresa já consegue comprovar?",
  "Implemente a ISO 27001 com a sua equipe e o nosso apoio.",
]);
assert.equal(H1_EXPERIMENTOS.iso27001.variantes[0].destaque, "tecnologia");
assert.equal(H1_EXPERIMENTOS.sassmaq40.variantes[0].depois, "?");
assert.equal(H1_EXPERIMENTOS.iso37001.variantes[0].destaque, "ISO 37001,");
assert.equal(H1_EXPERIMENTOS.iso42001.variantes[0].destaque, "ISO 42001:");

const baseEvento = {
  sessao_id: "11111111-1111-4111-8111-111111111111",
  pagina: "/consultoria/iso-9001-lp/",
  norma: "ISO 9001",
  dispositivo: "desktop",
  evento: "form_inicio",
  experimento_id: "tpl_h1_iso9001_r01",
  lp_id: "iso9001",
  variante_h1: 3,
  angulo: "execucao",
  variante_exposta: 3,
  angulo_exposto: "execucao",
  modo_teste: false,
  visitante_id: "22222222-2222-4222-8222-222222222222",
  persistencia: "local",
  estado: "em_execucao",
  h1_texto: "nao deve ir neste evento maria@empresa.com",
};

const inicio = sanitizeFormEvento(baseEvento);
assert.equal(inicio.experimento_id, "tpl_h1_iso9001_r01");
assert.equal(inicio.lp_id, "iso9001");
assert.equal(inicio.variante_h1, 3);
assert.equal(inicio.angulo, "execucao");
assert.equal(inicio.variante_exposta, 3);
assert.equal(inicio.modo_teste, undefined);
assert.equal(inicio.h1_texto, undefined);
assert.equal(JSON.stringify(inicio).includes("maria@"), false);

const exposto = sanitizeFormEvento({ ...baseEvento, evento: "h1_exposto", norma: "" });
assert.equal(exposto.evento, "h1_exposto");
assert.equal(exposto.h1_texto, undefined);

const falha = sanitizeFormEvento({
  ...baseEvento,
  evento: "h1_falha",
  variante_exposta: "",
  angulo_exposto: "",
  erro_codigo: "diverge",
  h1_texto: "Consultoria visivel maria@empresa.com",
});
assert.equal(falha.evento, "h1_falha");
assert.equal(falha.erro_codigo, "diverge");
assert.equal(falha.variante_exposta, undefined);
assert.equal(falha.h1_texto.includes("maria@"), false);
assert.equal(falha.h1_texto.includes("Consultoria visivel"), true);

const teste = sanitizeFormEvento({ ...baseEvento, evento: "whatsapp_clique", modo_teste: true });
assert.equal(teste.modo_teste, true);
assert.equal(teste.evento, "whatsapp_clique");

assert.deepEqual(camposH1({ experimento_id: "tpl_variante_h1", lp_id: "iso9001" }), {});
assert.equal(camposH1({ experimento_id: "tpl_h1_iso9001_r01", lp_id: "outra" }).experimento_id, undefined);

const lead = camposH1(baseEvento);
assert.equal(notaH1(lead).includes("tpl_h1_iso9001_r01"), true);
assert.equal(notaH1(lead).includes("\u2014"), false);
assert.equal(leadEhTesteH1({ ...lead, modo_teste: true }), true);
assert.equal(leadEhTesteH1(lead), false);
assert.equal(leadEhTesteH1({ modo_teste: true }), false);

console.log("h1 experimento ok");
