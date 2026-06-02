import { defineConfig } from 'astro/config';

// Site institucional Templum.
// Saída estática (zero JS por padrão) → ótimo SEO e zero 404 quando combinado
// com public/_redirects no Cloudflare Pages.
export default defineConfig({
  site: 'https://templum.com.br',
  build: {
    format: 'directory', // /pagina/ → /pagina/index.html (URLs limpas, sem .html)
  },
  trailingSlash: 'ignore',
});
