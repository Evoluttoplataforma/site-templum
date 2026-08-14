// Artigos recentes do blog (certificacaoiso.com.br) — lidos do Supabase NO BUILD.
// HTML estático na home do site; os artigos em si vivem no blog.
const SB_URL = import.meta.env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
const SB_ANON = import.meta.env.SUPABASE_ANON_KEY || "sb_publishable_Yfg9Ts5WRqD4Gc3jeWAS2A_-YWZrtiQ";
const H = { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` };
const BLOG = "https://certificacaoiso.com.br";

// resolve imagem relativa (/wp-content/...) p/ o domínio do blog
export function blogImg(u) { return !u ? "" : (u.startsWith("/") ? BLOG + u : u); }
export function blogUrl(slug) { return `${BLOG}/${slug}/`; }

// Capa do card: o blog não preenche `featured_image` — a imagem vem da CATEGORIA
// (tabela blog_templum_categories.image_url, mesma fonte que o certificacaoiso usa
// nos cards de listagem). Editar a imagem no CMS reflete nos dois sites.
const DEFAULT_CATEGORY_IMAGE = "/assets/categorias/default.jpg";

let _catImg = null;
async function getCategoryImageMap() {
  if (_catImg) return _catImg;
  try {
    const r = await fetch(`${SB_URL}/rest/v1/blog_templum_categories?select=name,image_url`, { headers: H });
    const cats = r.ok ? await r.json() : [];
    _catImg = Object.fromEntries(cats.filter((c) => c.image_url).map((c) => [c.name, c.image_url]));
  } catch (_) { _catImg = {}; }
  return _catImg;
}

let _cache = null;
export async function getRecentPosts(limit = 6) {
  if (_cache) return _cache.slice(0, limit);
  try {
    const [r, catImg] = await Promise.all([
      fetch(
        `${SB_URL}/rest/v1/blog_templum_posts?status=eq.published&select=title,slug,excerpt,featured_image,category_name,published_at&order=published_at.desc&limit=${limit}`,
        { headers: H }
      ),
      getCategoryImageMap(),
    ]);
    const posts = r.ok ? await r.json() : [];
    _cache = posts.map((p) => ({
      ...p,
      cover: blogImg(p.featured_image || catImg[p.category_name] || DEFAULT_CATEGORY_IMAGE),
    }));
  } catch (_) { _cache = []; }
  return _cache.slice(0, limit);
}
