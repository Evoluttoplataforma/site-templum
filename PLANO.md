# Plano de desenvolvimento — Site Templum

> Stack: **Astro** (estático) → **Cloudflare Pages**. Saindo do Framer.
> Identidade: Design System em `site/` (referência única — `/design-system`).
> Tracking: **tracking-kit** (https://github.com/rodrigoosouza/tracking-kit) — GTM alternativo (Meta/CAPI, Google Ads, GA4, TikTok, Clarity).

## Princípios (não negociáveis)
1. **Zero 404** — toda URL de `urls-templum.md` resolve (página nova ou redirect em `public/_redirects`).
2. **Design System manda** — toda página usa os componentes/classes do DS. Nada de estilo novo solto. `/design-system` é a fonte da verdade.
3. **Reusar só a COPY do `site atual/`** — textos, números, FAQs. Ignorar HTML/CSS/assets do Framer (imagens vêm do cliente).
4. **Números oficiais** (fonte site atual): +2.000 clientes certificados · +1,5 mi de interações · R$ 3,3 bi em ganhos · +30 anos · garantia 200%.
5. **Alternância de cor** escura/clara entre seções; acento sempre laranja.

## Fases

### Fase 0 — Design System ✅ (em finalização)
Tokens, tipografia, botões, badges, formulários, cards, clientes, normas (carrossel+grid), Orbit/Olívia, depoimentos, blog, newsletter, selo, faixas, FAQ, header, hero, footer, ícones. Tudo em `/design-system`.

### Fase 1 — Arquitetura de URLs (anti-404)
- Ler `urls-templum.md` (+200 URLs) e classificar: página real vs. redirect.
- Gerar `public/_redirects` (famílias `/lp/*`, `/lp-antigas/*`, `/ab/*`, `/certificado/*`, `/consult/*` → destino canônico).
- Definir estrutura de rotas em `src/pages/` (ex.: `/consultoria/[norma]`).
- Página **404** (usa o DS).

### Fase 2 — Template de Consultoria por norma
- 1 layout reutilizável (hero "dobro" → stats → método 7 passos → selo implementando → 100% online → "[Norma] em detalhes" → FAQ da norma → CTA).
- `src/data/consultoria/<norma>.js` com a copy extraída do `site atual` (8 normas: 9001, 14001, 27001, 37001, 45001, pbqp-h, sassmaq, fssc-22000 + haccp, esg, sgi, lgpd, 37301 conforme houver).
- Rotas `/consultoria/<slug>`, `/iso-9001`, etc. (as variações apontam pro canônico).

### Fase 3 — Institucionais
- `/quem-somos/sobre`, `/quem-somos/valores`, `/metodologia`, `/auditoria`, `/carreira`, `/franchising` — copy do site atual.

### Fase 4 — Conteúdo & nichos
- Cases (`/case-de-sucesso`) com os vídeos Vimeo já cadastrados.
- Blog (`/blog`) + posts. Treinamentos (`/cursos`, `/drops`). **PQTA/PQC** (cartórios — no escopo).

### Fase 5 — Conversão & Tracking
- `/form` e `/contato` (formulário do DS) + **Mailchimp** (Pages Function, reusar do projeto `iscas templum`).
- Integrar **tracking-kit**: snippet no `<head>` (Base), `data-trk-event` nos forms, `trk.lead()` nas conversões, preset lead-gen.

### Fase 6 — Deploy
- Cloudflare Pages, `_headers` (cache/segurança), checagem final de 404, SEO (sitemap, canonical, OG).

## Pendências do cliente
- Fotos das normas (`/assets/img/normas/<slug>.webp`) e capas de blog.
- Confirmar copy/numeros por norma ao montar cada página.
- Credenciais: Mailchimp, IDs do tracking-kit (Meta, GA4, etc.), número WhatsApp oficial.
