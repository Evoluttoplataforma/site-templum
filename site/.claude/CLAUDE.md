# Projeto: Site institucional Templum (Astro)

## Contexto
Reescrita do site da Templum (saindo do Framer) em Astro estático, alvo Cloudflare Pages.
Material-fonte fica na pasta-mãe (`../`): `manual da marca/`, `site atual/`, `site referencia /`
(benchmark G4), `urls-templum.md`, `Extract HTML Design System.md`.

## Regras de ouro
1. **Nunca quebrar URL.** Toda URL antiga em `../urls-templum.md` precisa resolver
   (página nova ou redirect em `public/_redirects`). Nada de 404.
2. **Fidelidade à marca.** Cores, fonte (Montserrat) e tom vêm do Manual de Marca 2025.
   Cada norma usa SUA cor de sub-marca (tokens `--norm-*` em `src/styles/tokens.css`).
3. **Reusar o design system.** Antes de criar estilo novo, usar as classes de
   `src/styles/global.css` e os componentes existentes. `/design-system` é a fonte da verdade.
4. **Benchmark, não cópia.** O G4 (`site referencia /`) é referência de layout/feeling
   (carrossel, stats, prova social) — adaptar à identidade Templum, não copiar.
5. **Estático e leve.** Zero JS por padrão; só `is:inline` para interações pontuais.

## Comandos
- `npm run dev` · `npm run build` · `npm run preview`

## Identidade (rápida)
- Primária `#FF5925` · Navy `#222831` · Creme `#FFF4DD`/`#FFFAEB`
- Garantia de 200% e "+30 anos / método próprio" são pilares de copy.
