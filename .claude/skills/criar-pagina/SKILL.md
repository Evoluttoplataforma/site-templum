---
name: criar-pagina
description: Cria uma nova página do site Templum usando o Design System. Use ao criar qualquer rota nova (consultoria, institucional, etc.) reaproveitando a copy do `site atual/`.
---

# Criar página do site Templum

Use quando for criar uma nova página/rota em `site/src/pages/`.

## Passos
1. **Conferir o Design System** (`site/src/pages/design-system.astro` + `site/src/styles/global.css`). Use SÓ componentes/classes que já existem. Não inventar estilo solto.
2. **Pegar a COPY** da página equivalente em `../site atual/` (ignorar HTML/CSS/assets do Framer — só texto, números, FAQs). Comando útil:
   `grep -oiE '<h[1-3][^>]*>[^<]+</h[1-3]>' "../site atual/<ARQUIVO>.html" | sed 's/<[^>]*>//g'`
3. **Montar com `Base.astro`** (`<Base title=... description=...>`), compondo as seções via componentes existentes (`HeroSlider`, `NormShowcase`, `Testimonials`, `SeloImplementando`, `OrbitPlatform`, `Newsletter`, etc.) e seções com `.section` / `.section--cream` / `.section--navy`.
4. **Alternar cor** das seções (escura/clara) e fechar com a faixa CTA laranja (`.cta-band`) antes do rodapé.
5. **Não quebrar URL:** garantir que a rota corresponde a `urls-templum.md`; variações antigas → redirect (ver skill `anti-404`).
6. **Validar:** `cd site && npm run build`, depois screenshot headless pra revisar.

## Regras
- Títulos Montserrat Extrabold; corpo Medium. Acento laranja com `<em class="accent">`.
- Números oficiais: +2.000 clientes · +1,5 mi interações · R$ 3,3 bi · +30 anos · garantia 200%.
- Páginas de consultoria seguem 1 template + dados por norma (`src/data/consultoria/<norma>.js`).
