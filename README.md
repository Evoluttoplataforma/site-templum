# Site Templum

Reescrita do site institucional da **Templum** (consultoria de certificações ISO), migrando do **Framer** para **Astro estático** (deploy **Cloudflare Pages**).

## Estrutura do repositório

```
.
├── site/                      # 👉 O SITE (projeto Astro). Veja site/README.md
│   ├── src/styles/            # Design System (tokens + global.css)
│   ├── src/components/        # Header, Footer, Hero, Orbit, Normas, etc.
│   ├── src/pages/             # index + /design-system (fonte da verdade visual)
│   └── public/                # assets + _redirects (anti-404)
├── .claude/                   # instruções (CLAUDE.md) + skills do projeto
├── PLANO.md                   # plano de desenvolvimento (fases)
│
│  ── material-fonte (não é código) ──
├── manual da marca/           # Manual de Marca 2025 (PDF)
├── site atual/                # export do Framer — reusar SÓ a copy
├── site referencia /          # benchmark G4 (layout/feeling)
├── orbit - olivia agentes.../ # referência da plataforma Orbit/Olívia
├── urls-templum.md            # +200 URLs que NÃO podem dar 404
├── logo templum/, img socios/, Logos templum clientes/, imagens para hero home/  # assets do cliente
```

## Rodar

```bash
cd site
npm install
npm run dev -- --port 4399     # http://localhost:4399  (4321 é do Orbit AI)
npm run build                  # gera site/dist
```

- **Design System:** http://localhost:4399/design-system

## Princípios

1. **Zero 404** — toda URL antiga resolve (página ou redirect). Ver `urls-templum.md` + skill `anti-404`.
2. **Design System manda** — `/design-system` é a referência de tudo.
3. **Só a copy** do `site atual` é reaproveitada (não o HTML/CSS do Framer).
4. **Marca:** Montserrat, laranja `#FF5925`, navy `#222831`, creme — cada norma com cor própria.

## Tracking
Stack de tracking: **[tracking-kit](https://github.com/rodrigoosouza/tracking-kit)** (substituto do GTM). Integração na Fase 5 (ver `PLANO.md`).

Detalhes técnicos do site: ver [`site/README.md`](site/README.md). Plano completo: [`PLANO.md`](PLANO.md).
