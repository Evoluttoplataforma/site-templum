// Histórias de clientes — lidas do Supabase NO BUILD (HTML estático, SEO ok).
// Keys públicas (anon); o RLS só devolve as aprovadas no select público.
const SB_URL = import.meta.env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
const SB_ANON = import.meta.env.SUPABASE_ANON_KEY || "sb_publishable_Yfg9Ts5WRqD4Gc3jeWAS2A_-YWZrtiQ";
const H = { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` };

// Segmentos de empresa (dropdown do formulário + agrupamento). Editar aqui se precisar.
export const SEGMENTOS = [
  "Indústria",
  "Construção Civil",
  "Alimentos e Bebidas",
  "Saúde e Bem-estar",
  "Tecnologia e TI",
  "Serviços",
  "Logística e Transporte",
  "Comércio e Varejo",
  "Agronegócio",
  "Outro",
];

// Credenciais expostas ao client (form de envio). Anon só insere como 'pending' (RLS).
export const SUPA_PUBLIC = { url: SB_URL, anon: SB_ANON };

let _cache = null;
export async function getHistorias() {
  if (_cache) return _cache;
  const r = await fetch(
    `${SB_URL}/rest/v1/blog_templum_historias?status=eq.approved&select=*&order=featured.desc,created_at.desc`,
    { headers: H }
  );
  if (!r.ok) { _cache = []; return _cache; } // sem tabela/coluna ainda → página vazia, não quebra build
  _cache = await r.json();
  return _cache;
}

// Agrupa as histórias aprovadas por segmento, na ordem de SEGMENTOS.
export async function getHistoriasPorSegmento() {
  const todas = await getHistorias();
  const grupos = [];
  for (const seg of SEGMENTOS) {
    const itens = todas.filter((h) => (h.segment || "Outro") === seg);
    if (itens.length) grupos.push({ segmento: seg, itens });
  }
  // segmentos fora da lista padrão
  const conhecidos = new Set(SEGMENTOS);
  const extras = {};
  for (const h of todas) { const s = h.segment || "Outro"; if (!conhecidos.has(s)) (extras[s] ||= []).push(h); }
  for (const [seg, itens] of Object.entries(extras)) grupos.push({ segmento: seg, itens });
  return grupos;
}
