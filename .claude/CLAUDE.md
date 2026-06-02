# Projeto — Site Templum

Reescrita do site da Templum (consultoria de certificações ISO), saindo do **Framer** para **Astro estático** → **Cloudflare Pages**. O código do site fica em **`site/`**.

## Onde está o quê
- `site/` — projeto Astro (o site). Rodar: `cd site && npm run dev -- --port 4399` (4321 é do Orbit AI).
- `site/src/` — `styles/` (tokens + global = design system), `components/`, `layouts/`, `pages/`, `data/`.
- `/design-system` (em `site/src/pages/design-system.astro`) — **fonte única da verdade visual**. Toda página nova sai dele.
- Material-fonte (NÃO é código): `manual da marca/`, `site atual/` (export Framer — usar só COPY), `site referencia /` (benchmark G4), `urls-templum.md`, `orbit - olivia agentes de ia /`.
- `PLANO.md` — plano de desenvolvimento e fases.

## Regras de ouro
1. **Zero 404.** Toda URL de `urls-templum.md` resolve (página ou redirect em `site/public/_redirects`).
2. **Design System manda.** Usar classes/componentes existentes; não inventar estilo solto. Conferir `/design-system` antes de criar.
3. **Reusar só a COPY do `site atual/`.** Ignorar HTML/CSS/assets do Framer. Imagens vêm do cliente.
4. **Identidade:** Montserrat (Extrabold títulos 800 / Medium corpo 500); laranja `#FF5925` (acento), navy `#222831` (escuro), creme `#FFFAEB`. Cada norma tem cor própria (tokens `--norm-*`).
5. **Alternância escura/clara** entre seções; faixa de CTA laranja antes do rodapé.
6. **Números oficiais:** +2.000 clientes · +1,5 mi interações · R$ 3,3 bi em ganhos · +30 anos · garantia 200%.

## Convenções técnicas (aprendizados)
- Conversão de imagem: o `sips` do macOS NÃO faz webp — usar **`cwebp`** (`/opt/homebrew/bin`).
- **Não** colocar expressões `{...}` dentro de blocos `<style>` em `.astro` (quebra o build).
- `overflow-x: clip` (não `hidden`) no html/body — `hidden` quebra `position: sticky` do header.
- Seção que é componente próprio (não usa `.section`) precisa de `padding` explícito (ex.: `.selo`, `.nl`, `.orbit`) — senão fica "colada".
- `.tag-pill` tem `align-self:flex-start; width:fit-content` p/ não esticar em coluna flex.
- Ícones: Iconify (`solar:`/`mdi:`), já carregado no `Base.astro`.

## Tracking
- Stack: **tracking-kit** (https://github.com/rodrigoosouza/tracking-kit) — substituto do GTM. Integrar na Fase 5: snippet no `<head>` do `Base.astro`, `data-trk-event` nos forms, `trk.lead()` nas conversões. Preset lead-gen.

## Fluxo de trabalho
- Alinhar antes de construir páginas (o cliente valida copy/escopo).
- Ao criar página: usar skill `criar-pagina`; ao mexer em URLs: skill `anti-404`.
- Após mudanças, `npm run build` e screenshot via headless Chrome para validar.
