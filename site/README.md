# Templum · Site institucional

Site institucional da Templum em **Astro** (saída estática), substituindo o Framer.
Hospedagem alvo: **Cloudflare Pages** (mesmo padrão do projeto `iscas templum`).

## Stack & princípios

- **Astro 4** — gera HTML estático, zero JS por padrão → SEO forte e páginas rápidas.
- **Design system próprio** em `src/styles/` (tokens do Manual de Marca 2025).
- **Componentização** — header, footer, carrossel de normas, cards reutilizados em todas as páginas.
- **Zero 404** — `public/_redirects` mapeia as URLs antigas (ver `../urls-templum.md`).

## Rodar localmente

```bash
cd site
npm install
npm run dev      # http://localhost:4321
npm run build    # gera ./dist
npm run preview  # serve o ./dist
```

## Estrutura

```
site/
├── src/
│   ├── styles/
│   │   ├── tokens.css      # variáveis: cores da marca + cor por norma, sombras, raios
│   │   └── global.css      # sistema (tipografia, botões, cards, faq, marquee, footer)
│   ├── data/normas.js      # 12 normas: nome, cor da sub-marca, tagline, URL
│   ├── layouts/Base.astro  # <head>, fontes, Iconify, reveal-on-scroll, header/footer
│   ├── components/
│   │   ├── Header.astro       # nav + mega-menu de normas + menu mobile
│   │   ├── Footer.astro
│   │   └── NormCarousel.astro # carrossel (inspirado no G4) — cada card na cor da norma
│   └── pages/
│       ├── index.astro          # Home (hero, stats, carrossel, método, garantia, FAQ, CTA)
│       └── design-system.astro  # /design-system — design system navegável (fonte da verdade)
└── public/
    ├── assets/{logo,img}/    # logos e imagens
    └── _redirects            # regras anti-404 (Cloudflare Pages)
```

## Identidade visual (resumo do Manual 2025)

- **Fonte:** Montserrat (Extrabold em títulos, Medium em texto).
- **Cores:** laranja `#FF5925` (primária), navy `#222831`, creme `#FFF4DD`/`#FFFAEB`.
- **Sub-marcas:** cada norma tem cor própria (ISO 9001 azul, 27001 teal, 14001 verde,
  45001/PBQP-H marrom, 37001 vermelho, FSSC/HACCP amarelo, ESG/SGI verde-limão, SASSMAQ índigo).
- **Tom:** caloroso, acessível, progressivo, simples (ver "Branding Style" do manual).

## Próximos passos

1. Gerar `_redirects` completo a partir de `urls-templum.md` (script).
2. Páginas de consultoria por norma (`/consultoria/<slug>`) usando os componentes.
3. Páginas institucionais (quem-somos, metodologia, auditoria, cases).
4. Migrar conteúdo de cases de sucesso (será fornecido).
5. Integração de formulário (`/form`) — reaproveitar a Pages Function do Mailchimp das iscas.
