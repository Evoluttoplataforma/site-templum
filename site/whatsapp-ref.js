// Sanitiza o código de referência do WhatsApp antes de gravar em
// site_whatsapp_refs. Não entra nome, e-mail, telefone nem empresa.
// Colunas esperadas: ref, pagina, norma, dispositivo, sessao_id,
// gclid, gbraid, wbraid, utm_source, utm_medium, utm_campaign, utm_term.

const REF = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;
const DISPOSITIVOS = new Set(["mobile", "tablet", "desktop"]);
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
const FONE = /\+?\d[\d\s().-]{7,}\d/g;
const CLIQUE = /^[A-Za-z0-9._~:-]{1,200}$/;

function texto(value) {
  if (value == null) return "";
  return String(value).replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
}

function semPessoa(value, max) {
  return texto(value).replace(EMAIL, "").replace(FONE, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function id(value) {
  const s = texto(value).slice(0, 80);
  if (!/^[A-Za-z0-9-]{8,80}$/.test(s)) return "";
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

function clique(value) {
  const s = texto(value).slice(0, 200);
  if (!s || s.includes("@") || !CLIQUE.test(s)) return "";
  return s;
}

function utm(value) {
  const s = semPessoa(value, 120);
  if (!s || s.includes("@")) return "";
  return s;
}

export function sanitizeWhatsappRef(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const ref = texto(input.ref);
  if (!REF.test(ref)) return null;

  const row = { ref };

  const pag = pagina(input.pagina);
  if (pag) row.pagina = pag;

  const n = norma(input.norma);
  if (n) row.norma = n;

  if (DISPOSITIVOS.has(input.dispositivo)) row.dispositivo = input.dispositivo;

  const sessao = id(input.sessao_id);
  if (sessao) row.sessao_id = sessao;

  for (const key of ["gclid", "gbraid", "wbraid"]) {
    const v = clique(input[key]);
    if (v) row[key] = v;
  }

  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term"]) {
    const v = utm(input[key]);
    if (v) row[key] = v;
  }

  return row;
}
