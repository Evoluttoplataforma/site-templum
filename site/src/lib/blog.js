// Artigos recentes do blog (certificacaoiso.com.br) — lidos do Supabase NO BUILD.
// HTML estático na home do site; os artigos em si vivem no blog.
const SB_URL = import.meta.env.SUPABASE_URL || "https://yfpdrckyuxltvznqfqgh.supabase.co";
const SB_ANON = import.meta.env.SUPABASE_ANON_KEY || "sb_publishable_Yfg9Ts5WRqD4Gc3jeWAS2A_-YWZrtiQ";
const H = { apikey: SB_ANON, Authorization: `Bearer ${SB_ANON}` };
const BLOG = "https://certificacaoiso.com.br";

// resolve imagem relativa (/wp-content/...) p/ o domínio do blog
export function blogImg(u) { return !u ? "" : (u.startsWith("/") ? BLOG + u : u); }
export function blogUrl(slug) { return `${BLOG}/${slug}/`; }

let _cache = null;
export async function getRecentPosts(limit = 6) {
  if (_cache) return _cache.slice(0, limit);
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/blog_templum_posts?status=eq.published&select=title,slug,excerpt,featured_image,category_name,published_at&order=published_at.desc&limit=${limit}`,
      { headers: H }
    );
    _cache = r.ok ? await r.json() : [];
  } catch (_) { _cache = []; }
  return _cache.slice(0, limit);
}
