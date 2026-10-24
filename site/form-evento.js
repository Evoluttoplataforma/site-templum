// Sanitiza o funil do formulário antes de gravar em site_form_eventos.
// Só entram as colunas da tabela. Nome, e-mail, telefone, empresa e o
// conteúdo de qualquer campo são descartados.

const EVENTOS = new Set([
  "form_visivel",
  "form_inicio",
  "envio_clique",
  "envio_ok",
  "erro_validacao",
  "erro_turnstile",
  "erro_servidor",
  "erro_rede",
  "whatsapp_clique",
  "envio_sem_resposta",
  "h1_exposto",
  "h1_falha",
]);

const DISPOSITIVOS = new Set(["mobile", "tablet", "desktop"]);

const NAVEGADORES = new Set([
  "Instagram",
  "Facebook",
  "Google",
  "LinkedIn",
  "Chrome",
  "Safari",
  "Firefox",
  "Edge",
  "Opera",
  "Samsung Internet",
  "Outro",
]);

import { camposH1 } from "./h1-experimento.js";

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const FONE = /\+?\d[\d\s().-]{7,}\d/g;

function texto(value) {
  if (value == null) return "";
  return String(value).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
}

function semPessoa(value, max) {
  return texto(value).replace(EMAIL, "").replace(FONE, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function token(value, max) {
  const s = texto(value).slice(0, max);
  if (!/^[A-Za-z0-9_.:-]{1,40}$/.test(s)) return "";
  return s;
}

function id(value) {
  const s = texto(value).slice(0, 80);
  if (!/^[A-Za-z0-9-]{8,80}$/.test(s)) return "";
  return s;
}

function refCodigo(value) {
  const s = texto(value);
  if (!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/.test(s)) return "";
  return s;
}

function pagina(value) {
  let s = texto(value).split("?")[0].split("#")[0];
  if (!s.startsWith("/")) return "";
  s = s.slice(0, 180);
  if (s.includes("@")) return "";
  return s;
}

function norma(value) {
  const s = semPessoa(value, 80);
  if (!s || s.includes("@")) return "";
  if (!/^[\p{L}\p{N} .+/()-]{1,80}$/u.test(s)) return "";
  return s;
}

function campo(value) {
  const s = texto(value).slice(0, 40);
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,39}$/.test(s)) return "";
  return s;
}

function utm(value) {
  const s = semPessoa(value, 120);
  if (!s || s.includes("@")) return "";
  return s;
}

export function sanitizeFormEvento(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const evento = token(input.evento, 40);
  if (!EVENTOS.has(evento)) return null;

  const row = {
    evento,
    tem_clique_anuncio: input.tem_clique_anuncio === true,
  };

  const sessao = id(input.sessao_id);
  if (sessao) row.sessao_id = sessao;

  const pag = pagina(input.pagina);
  if (pag) row.pagina = pag;

  const n = norma(input.norma);
  if (n) row.norma = n;

  if (DISPOSITIVOS.has(input.dispositivo)) row.dispositivo = input.dispositivo;
  if (NAVEGADORES.has(input.navegador_app)) row.navegador_app = input.navegador_app;

  if (evento === "erro_validacao") {
    const c = campo(input.campo);
    if (c) row.campo = c;
  }

  if (
    evento === "erro_validacao" ||
    evento === "erro_turnstile" ||
    evento === "erro_servidor" ||
    evento === "erro_rede" ||
    evento === "envio_sem_resposta" ||
    evento === "h1_falha"
  ) {
    const code = token(input.erro_codigo, 40);
    if (code) row.erro_codigo = code;
    const msg = semPessoa(input.erro_msg, 200);
    if (msg) row.erro_msg = msg;
  }

  if (evento === "envio_ok") {
    const lead = id(input.lead_event_id);
    if (lead) row.lead_event_id = lead;
  }

  if (evento === "whatsapp_clique") {
    const ref = refCodigo(input.lead_event_id);
    if (ref) row.lead_event_id = ref;
  }

  const us = utm(input.utm_source);
  const um = utm(input.utm_medium);
  const uc = utm(input.utm_campaign);
  if (us) row.utm_source = us;
  if (um) row.utm_medium = um;
  if (uc) row.utm_campaign = uc;

  const h1 = camposH1(input);
  if (h1.experimento_id) {
    const sessao = row.sessao_id;
    Object.assign(row, h1);
    if (sessao) row.sessao_id = sessao;
    if (evento !== "h1_falha") delete row.h1_texto;
  }

  return row;
}
