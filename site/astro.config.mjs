import { defineConfig } from 'astro/config';

// Site institucional Templum.
// Saída estática (zero JS por padrão) → ótimo SEO e zero 404 quando combinado
// com public/_redirects no Cloudflare.
// O sitemap.xml é gerado pós-build por scripts/sitemap.mjs (npm run build).
export default defineConfig({
  site: 'https://templum.com.br',
  build: {
    format: 'directory', // /pagina/ → /pagina/index.html (URLs limpas, sem .html)
  },
  trailingSlash: 'ignore',
});
