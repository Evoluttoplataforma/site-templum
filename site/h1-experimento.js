// Sorteio do H1 e sanitização da medição.
// A lógica pura fica aqui. O navegador recebe as funções de tela via clientJs().

const ANGULOS = new Set(["controle", "exigencia", "execucao", "beneficio", "metodo", "proposta"]);
const ESTADOS = new Set(["inativo", "em_execucao", "encerrado"]);
const PERSISTENCIAS = new Set(["local", "sessao", "memoria", "fixa"]);
const LP_IDS = new Set(["iso9001", "iso9001v2", "iso27001", "iso27001v2", "pbqph", "pbqphv2", "sassmaq40", "iso37001", "iso42001"]);

function texto(value) {
  if (value == null) return "";
  return String(value).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
}

function semPessoa(value, max) {
  return texto(value)
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function textoDe(variante) {
  if (!variante) return "";
  return String(variante.antes || "") + String(variante.destaque || "") + String(variante.depois || "");
}

export function normalizarTexto(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function estadoOk(value) {
  return value === "inativo" || value === "em_execucao" || value === "encerrado";
}

function anguloOk(value) {
  return value === "controle" || value === "exigencia" || value === "execucao" || value === "beneficio" || value === "metodo" || value === "proposta";
}

function varianteDe(config, n) {
  const lista = (config && config.variantes) || [];
  const numero = Number(n);
  for (let i = 0; i < lista.length; i++) {
    if (Number(lista[i].n) === numero) return lista[i];
  }
  return null;
}

export function parseQa(search) {
  let params;
  try {
    params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  } catch (_) {
    return null;
  }
  const raw = params.get("h1");
  if (raw == null || !/^[1-6]$/.test(raw)) return null;
  return Number(raw);
}

function numeroSorteado(random, total) {
  let n = 0;
  try {
    n = typeof random === "function" ? Number(random()) : Math.random();
  } catch (_) {
    n = 0;
  }
  if (!Number.isFinite(n) || n < 0 || n >= 1) n = 0;
  const limite = Number.isInteger(total) && total >= 1 && total <= 6 ? total : 5;
  return Math.floor(n * limite) + 1;
}

function randomPadrao() {
  try {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  } catch (_) {
    return Math.random();
  }
}

export function resolver(config, env) {
  env = env || {};
  const qa = parseQa(env.search || "");
  const modoTeste = qa != null;
  const estado = config && estadoOk(config.estado) ? config.estado : "inativo";
  const controle = varianteDe(config, 1);
  let atribuida = null;
  let persistencia = "";

  if (estado === "em_execucao" && config && config.experimento_id) {
    const lida = env.ler ? env.ler(config.experimento_id) : null;
    const salva = lida ? varianteDe(config, lida.v) : null;
    if (salva) {
      atribuida = { variante: salva.n, angulo: salva.angulo };
      persistencia = lida.persistencia || "local";
    } else if (!modoTeste) {
      const sorte = varianteDe(config, numeroSorteado(env.random || randomPadrao, (config.variantes || []).length)) || controle;
      if (sorte) {
        atribuida = { variante: sorte.n, angulo: sorte.angulo };
        persistencia = env.gravar ? env.gravar(config.experimento_id, atribuida) : "memoria";
      }
    }
  } else if (estado === "encerrado") {
    const fixa = varianteDe(config, config && config.variante_fixa) || controle;
    if (fixa) atribuida = { variante: fixa.n, angulo: fixa.angulo };
    persistencia = "fixa";
  }

  let exposta = atribuida ? varianteDe(config, atribuida.variante) : controle;
  if (modoTeste) exposta = varianteDe(config, qa) || exposta || controle;
  if (!exposta) exposta = controle;

  const medir = !!(config && config.experimento_id) && (estado === "em_execucao" || estado === "encerrado" || modoTeste);
  return {
    estado,
    experimento_id: (config && config.experimento_id) || "",
    lp_id: (config && config.lp_id) || "",
    modo_teste: modoTeste,
    persistencia,
    atribuida,
    exposta,
    medir,
    trocar: !!(exposta && controle && Number(exposta.n) !== Number(controle.n)),
    falha: "",
    texto: "",
    expostaEfetiva: null,
  };
}

function idSeguro() {
  try {
    const id = crypto.randomUUID();
    if (/^[A-Za-z0-9-]{8,80}$/.test(id)) return id;
  } catch (_) {}
  return "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 12);
}

function garantirChave(store, chave) {
  try {
    if (!store) return "";
    const cur = store.getItem(chave) || "";
    if (/^[A-Za-z0-9-]{8,80}$/.test(cur)) return cur;
    const id = idSeguro();
    store.setItem(chave, id);
    return id;
  } catch (_) {
    return "";
  }
}

export function lerAtribuicao(win, chave) {
  const locais = [
    ["local", win && win.localStorage],
    ["sessao", win && win.sessionStorage],
  ];
  for (let i = 0; i < locais.length; i++) {
    try {
      const store = locais[i][1];
      if (!store) continue;
      const raw = store.getItem(chave);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const n = Number(data && data.v);
      if (Number.isInteger(n) && n >= 1 && n <= 6) {
        return { v: n, a: (data && data.a) || "", persistencia: locais[i][0] };
      }
    } catch (_) {}
  }
  try {
    const mem = win && win.__tplH1Mem && win.__tplH1Mem[chave];
    if (!mem) return null;
    const data = JSON.parse(mem);
    const n = Number(data && data.v);
    if (Number.isInteger(n) && n >= 1 && n <= 6) {
      return { v: n, a: (data && data.a) || "", persistencia: "memoria" };
    }
  } catch (_) {}
  return null;
}

export function gravarAtribuicao(win, chave, atribuicao) {
  const pacote = JSON.stringify({ v: atribuicao.variante, a: atribuicao.angulo });
  try {
    win.localStorage.setItem(chave, pacote);
    return "local";
  } catch (_) {}
  try {
    win.sessionStorage.setItem(chave, pacote);
    return "sessao";
  } catch (_) {}
  try {
    win.__tplH1Mem = win.__tplH1Mem || {};
    win.__tplH1Mem[chave] = pacote;
  } catch (_) {}
  return "memoria";
}

function criarEnv(win) {
  return {
    search: (win.location && win.location.search) || "",
    random: randomPadrao,
    ler: function (chave) { return lerAtribuicao(win, chave); },
    gravar: function (chave, atribuicao) { return gravarAtribuicao(win, chave, atribuicao); },
  };
}

export function pintarH1(doc, h1, variante) {
  while (h1.firstChild) h1.removeChild(h1.firstChild);
  h1.appendChild(doc.createTextNode(variante.antes || ""));
  if (variante.destaque) {
    const span = doc.createElement("span");
    span.className = "cs-hl";
    span.appendChild(doc.createTextNode(variante.destaque));
    h1.appendChild(span);
  }
  if (variante.depois) h1.appendChild(doc.createTextNode(variante.depois || ""));
}

function textoDoElemento(el) {
  try {
    return String(el.textContent || "");
  } catch (_) {
    return "";
  }
}

export function medicaoDe(resultado, win) {
  const atr = resultado && resultado.atribuida;
  const exp = resultado && resultado.expostaEfetiva;
  return {
    experimento_id: (resultado && resultado.experimento_id) || "",
    lp_id: (resultado && resultado.lp_id) || "",
    variante_h1: atr ? atr.variante : "",
    angulo: atr ? atr.angulo : "",
    variante_exposta: exp ? exp.n : "",
    angulo_exposto: exp ? exp.angulo : "",
    modo_teste: !!(resultado && resultado.modo_teste),
    visitante_id: garantirChave(win && win.localStorage, "tpl_cid"),
    sessao_id: garantirChave(win && win.sessionStorage, "tpl_funil_sid"),
    persistencia: (resultado && resultado.persistencia) || "",
    estado: (resultado && resultado.estado) || "",
    h1_texto: resultado && resultado.falha ? String(resultado.texto || "").slice(0, 240) : "",
    h1_falha: (resultado && resultado.falha) || "",
  };
}

function soltarH1(doc) {
  try { doc.documentElement.classList.remove("tpl-h1-wait"); } catch (_) {}
}

export function aplicarNoDocumento(doc, win, config) {
  const resultado = resolver(config, criarEnv(win));
  const h1 = doc.getElementById ? doc.getElementById("tpl-h1") : null;
  try {
    if (!h1) {
      if (resultado.medir) resultado.falha = "sem_h1";
    } else if (resultado.exposta) {
      if (resultado.trocar) pintarH1(doc, h1, resultado.exposta);
      const obtido = textoDoElemento(h1);
      resultado.texto = obtido;
      if (normalizarTexto(obtido) !== normalizarTexto(textoDe(resultado.exposta))) {
        resultado.falha = "diverge";
      } else {
        resultado.expostaEfetiva = resultado.exposta;
      }
    }
  } catch (_) {
    resultado.falha = "render";
    resultado.texto = h1 ? textoDoElemento(h1) : "";
    resultado.expostaEfetiva = null;
  }
  soltarH1(doc);
  if (resultado.medir) {
    const medicao = medicaoDe(resultado, win);
    try { win.__tplH1 = { medicao: medicao }; } catch (_) {}
    try { win.sessionStorage.setItem("tpl_h1_origem", JSON.stringify(medicao)); } catch (_) {}
    resultado.medicao = medicao;
  } else {
    try { win.__tplH1 = null; } catch (_) {}
  }
  return resultado;
}

function dispositivo(win) {
  try {
    const ua = (win.navigator && win.navigator.userAgent) || "";
    const w = win.innerWidth || 0;
    if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return "tablet";
    if (/Mobi|iPhone|iPod|Android.+Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return "mobile";
    if (w && w < 768) return "mobile";
    return "desktop";
  } catch (_) {
    return "";
  }
}

function jaEnviou(win, experimentoId) {
  const chave = "tpl_h1_exp_" + experimentoId;
  try {
    if (win.sessionStorage.getItem(chave)) return true;
    win.sessionStorage.setItem(chave, "1");
    return false;
  } catch (_) {
    win.__tplH1Exp = win.__tplH1Exp || {};
    if (win.__tplH1Exp[experimentoId]) return true;
    win.__tplH1Exp[experimentoId] = 1;
    return false;
  }
}

function enviarEvento(win, payload) {
  let corpo = "";
  try { corpo = JSON.stringify(payload); } catch (_) { return; }
  try {
    if (win.navigator && win.navigator.sendBeacon) {
      const blob = new Blob([corpo], { type: "application/json" });
      if (win.navigator.sendBeacon("/api/form-evento", blob)) return;
    }
  } catch (_) {}
  try {
    win.fetch("/api/form-evento", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: corpo,
      keepalive: true,
    }).catch(function () {});
  } catch (_) {}
}

function marcarClarity(win, id, valor, modo) {
  function setar() {
    try {
      if (typeof win.clarity !== "function") return false;
      win.clarity("set", id, String(valor));
      if (modo) win.clarity("set", id + "_modo", "teste");
      return true;
    } catch (_) {
      return false;
    }
  }
  if (setar()) return;
  let n = 0;
  const timer = setInterval(function () {
    n += 1;
    if (setar() || n > 20) clearInterval(timer);
  }, 1000);
}

function publicarMedicao(win, resultado) {
  if (!resultado || !resultado.medir || !resultado.medicao) return;
  const medicao = resultado.medicao;
  if (!jaEnviou(win, medicao.experimento_id)) {
    const evento = medicao.h1_falha ? "h1_falha" : "h1_exposto";
    const payload = {
      evento: evento,
      pagina: (win.location && win.location.pathname) || "/",
      sessao_id: medicao.sessao_id,
      experimento_id: medicao.experimento_id,
      lp_id: medicao.lp_id,
      variante_h1: medicao.variante_h1,
      angulo: medicao.angulo,
      variante_exposta: medicao.variante_exposta,
      angulo_exposto: medicao.angulo_exposto,
      modo_teste: medicao.modo_teste === true,
      visitante_id: medicao.visitante_id,
      persistencia: medicao.persistencia,
      estado: medicao.estado,
      dispositivo: dispositivo(win),
    };
    if (evento === "h1_falha") {
      payload.erro_codigo = String(medicao.h1_falha || "render").slice(0, 40);
      payload.h1_texto = medicao.h1_texto || "";
    }
    enviarEvento(win, payload);
  }
  if (medicao.variante_exposta) marcarClarity(win, medicao.experimento_id, medicao.variante_exposta, medicao.modo_teste);
}

export function tplH1Aplicar() {
  let resultado = null;
  try {
    resultado = aplicarNoDocumento(document, window, window.__TPL_H1_CONFIG || null);
  } catch (_) {
    try { document.documentElement.classList.remove("tpl-h1-wait"); } catch (__) {}
    return;
  }
  try { publicarMedicao(window, resultado); } catch (_) {}
}

export function instalarCliente() {
  window.tplH1Aplicar = tplH1Aplicar;
}

function inteiroVariante(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 6) return null;
  return n;
}

export function camposH1(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const experimento = texto(input.experimento_id);
  if (!/^tpl_h1_[a-z0-9]+_r[0-9]{2}$/.test(experimento) || experimento.length > 40) return {};
  const lp = texto(input.lp_id);
  if (!LP_IDS.has(lp)) return {};
  const out = { experimento_id: experimento, lp_id: lp };
  const variante = inteiroVariante(input.variante_h1);
  if (variante) out.variante_h1 = variante;
  const angulo = texto(input.angulo);
  if (ANGULOS.has(angulo)) out.angulo = angulo;
  const exposta = inteiroVariante(input.variante_exposta);
  if (exposta) out.variante_exposta = exposta;
  const anguloExposto = texto(input.angulo_exposto);
  if (ANGULOS.has(anguloExposto)) out.angulo_exposto = anguloExposto;
  if (input.modo_teste === true) out.modo_teste = true;
  const visitante = texto(input.visitante_id);
  if (/^[A-Za-z0-9-]{8,80}$/.test(visitante)) out.visitante_id = visitante;
  const sessao = texto(input.sessao_id);
  if (/^[A-Za-z0-9-]{8,80}$/.test(sessao)) out.sessao_id = sessao;
  const persistencia = texto(input.persistencia);
  if (PERSISTENCIAS.has(persistencia)) out.persistencia = persistencia;
  const estado = texto(input.estado);
  if (ESTADOS.has(estado)) out.estado = estado;
  const h1Texto = semPessoa(input.h1_texto, 240);
  if (h1Texto) out.h1_texto = h1Texto;
  return out;
}

export function notaH1(lead) {
  if (!lead || !lead.experimento_id) return "";
  return [
    "Experimento H1: " + lead.experimento_id,
    "LP: " + (lead.lp_id || ""),
    "Variante atribuida: " + (lead.variante_h1 || ""),
    "Angulo: " + (lead.angulo || ""),
    "Variante exposta: " + (lead.variante_exposta || ""),
    "Angulo exposto: " + (lead.angulo_exposto || ""),
    "Modo teste: " + (lead.modo_teste ? "sim" : "nao"),
    "Visitante: " + (lead.visitante_id || ""),
    "Sessao: " + (lead.sessao_id || ""),
    "Persistencia: " + (lead.persistencia || ""),
  ].join(" | ");
}

export function leadEhTesteH1(lead) {
  return !!(lead && lead.modo_teste === true && lead.experimento_id);
}

const CLIENTE = [
  estadoOk,
  varianteDe,
  numeroSorteado,
  randomPadrao,
  idSeguro,
  garantirChave,
  textoDoElemento,
  soltarH1,
  criarEnv,
  dispositivo,
  jaEnviou,
  enviarEvento,
  marcarClarity,
  publicarMedicao,
  textoDe,
  normalizarTexto,
  parseQa,
  resolver,
  lerAtribuicao,
  gravarAtribuicao,
  pintarH1,
  medicaoDe,
  aplicarNoDocumento,
  tplH1Aplicar,
  instalarCliente,
];

export function clientJs() {
  return CLIENTE.map((fn) => fn.toString()).join("\n") + "\ninstalarCliente();\n";
}
