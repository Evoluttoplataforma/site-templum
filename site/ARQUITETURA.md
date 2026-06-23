# Templum — Arquitetura do Sistema (Site · Blog · CMS)

> Documentação para o time (Cursor / VS Code / Claude Code). Leia a seção
> **“⚠️ GIT & DEPLOY”** antes de commitar — ela evita publicar no lugar errado.
>
> 👉 **Novo no projeto / não é muito de git?** Comece pelo **`COMO-TRABALHAR.md`**
> (guia rápido do dia a dia, passo a passo no Cursor).

---

## 1. Visão geral

Três aplicações **Astro (estáticas)** + **Supabase** (fonte única de dados) + **Cloudflare Workers** (deploy).

```
                         ┌─────────────────────────┐
                         │  Supabase (MKT ORBIT)    │  ← fonte única (posts, iscas,
                         │  projeto yfpdrckyuxlt... │     comentários, leads, histórias…)
                         └─────────────┬───────────┘
            lê no BUILD ┌──────────────┼───────────────┐ CRUD client-side (Auth)
                        ▼              ▼                ▼
   ┌────────────────┐  ┌────────────────────┐  ┌────────────────────────┐
   │ SITE           │  │ BLOG               │  │ CMS                    │
   │ templum.com.br │  │ certificacaoiso... │  │ .../acesso (proxy)     │
   │ Astro estático │  │ Astro (lê Supabase │  │ Astro+Tailwind, painel │
   │                │  │ no build)          │  │ admin (Supabase Auth)  │
   └────────────────┘  └────────────────────┘  └────────────────────────┘
        Worker              Worker                    Worker
     site-templum        certificacaoiso-blog      certificacaoiso-cms
```

**Regra-chave:** o conteúdo (posts, iscas, comentários, histórias) vive no **Supabase**.
O blog lê **no build** e gera HTML estático → SEO/AIEO intactos. O CMS edita o Supabase;
publicar dispara um **rebuild** do blog (Edge Function → Deploy Hook da Cloudflare).

---

## 2. Os três projetos

| App | Domínio | Pasta local | Repo GitHub | Worker Cloudflare |
|---|---|---|---|---|
| **Site** | `templum.com.br` | `site/` | `Evoluttoplataforma/site-templum` | `site-templum` |
| **Blog** | `certificacaoiso.com.br` | `certificacaoiso/` | `Evoluttoplataforma/certificacaoiso---Blog-templum` | `certificacaoiso-blog` |
| **CMS** | `certificacaoiso.com.br/acesso` | `cms-blog-templum-certificacaoiso/` | `Evoluttoplataforma/cms-blog-templum-certificacaoiso` | `certificacaoiso-cms` |

- **Site** — institucional (consultoria, normas, cases, histórias, presentes). Astro estático,
  `trailingSlash: 'ignore'`, `format: 'directory'`.
- **Blog** — 1.015 posts migrados do WordPress + iscas (`/presentes/<slug>`) + comentários.
  Lê o Supabase no build. `trailingSlash: 'always'`.
- **CMS** — painel admin (Notion-style). `base: '/acesso'`, Tailwind, `@supabase/supabase-js`,
  Supabase Auth. CRUD direto no Supabase + botão “Republicar site”.

> O CMS é servido em `certificacaoiso.com.br/acesso` por **proxy do Worker do blog**
> (o `worker.js` do blog encaminha `/acesso*` para o Worker do CMS). Não é rota nem subdomínio.

---

## 3. Supabase — fonte única

- **Projeto:** `yfpdrckyuxltvznqfqgh` (nome de exibição: **MKT ORBIT**).
- **URL:** `https://yfpdrckyuxltvznqfqgh.supabase.co`
- **Tabelas:** sempre com prefixo **`blog_templum_`** (este projeto Supabase é compartilhado
  com outro blog — por isso o prefixo e o prefixo nas Edge Functions).
  - `blog_templum_posts` · `_categories` · `_iscas` · `_leads` · `_comments` · `_historias` · `_banners`
- **Chaves:** a **anon (publishable)** é pública e fica no código (com fallback) — o **RLS** protege.
  A **service_role NUNCA** vai pro código/git/chat — só em *Edge Function Secrets* ou
  via env na hora de rodar um script (`SUPABASE_SERVICE_KEY=... node ...`).
- **RLS (resumo):** público lê `published`/`approved`/`active`; `authenticated` gerencia tudo;
  `anon` só **insere** lead/comentário/história como **`pending`**.
- **Edge Functions** (Deno, “Verify JWT” OFF — validam o usuário internamente):
  - `blog-templum-create-user` — cria colaborador (Admin API, senha direta).
  - `blog-templum-rebuild` — dispara o **Deploy Hook** da Cloudflare (`CLOUDFLARE_DEPLOY_HOOK_URL`)
    → blog reconstrói lendo o Supabase. (É o que o “Republicar site” chama.)

---

## 4. Rodar local (dev)

```bash
# Site
cd site && npm install && npm run dev            # (use --port 4399 se 4321 estiver ocupada)

# Blog
cd certificacaoiso && npm install && npm run dev

# CMS
cd cms-blog-templum-certificacaoiso && npm install && npm run dev   # porta 4444
```

- **Build:** `npm run build` em cada projeto (gera `dist/`).
- **Preview do build:** `npm run preview` (serve o `dist/`).
- Não precisa de `.env`: as chaves públicas do Supabase têm fallback no código.

---

## 5. Deploy (Cloudflare Workers Builds)

Cada repo está conectado ao seu Worker via **Workers Builds**:
**push na branch `main` → build + deploy automático** (sem rodar wrangler na mão).

- Site/Blog: deploy padrão (`wrangler deploy`).
- **CMS: deploy via `wrangler versions upload`** → ⚠️ **NÃO** coloque `routes` no `wrangler.toml`
  (versions upload ignora; quebra o deploy). Rotas/domínios do CMS vão **no painel** da Cloudflare.
- **`/acesso` (CMS):** resolvido por **proxy** no `worker.js` do blog (path-based). Não mexa nisso
  sem entender — alterar o domínio do blog ou o proxy pode derrubar o `/acesso`.

**Mudança de dados/schema do Supabase NÃO vai por git.** Os arquivos em
`certificacaoiso/supabase/*.sql` são **referência** — quem aplica é você, no **SQL Editor**
do Supabase (ou via Edge Function / script com service_role por env).

---

## 6. ⚠️ GIT & DEPLOY — onde commitar/pushar (LEIA, Claude/Cursor)

> **São TRÊS repositórios separados, cada um com o SEU remote.** Misturar = “zika”.

1. **Antes de QUALQUER commit**, confirme onde você está:
   ```bash
   pwd                    # tem que estar DENTRO de site/ OU certificacaoiso/ OU cms-.../
   git remote -v          # confirme que o remote bate com o que você quer publicar
   ```
2. **Mudou só o site** → `cd site` → commit/push. **Mudou o blog** → `cd certificacaoiso`.
   **Mudou o CMS** → `cd cms-blog-templum-certificacaoiso`. **Nunca** commite arquivos de um
   projeto dentro do repo de outro (eles são repos diferentes; a pasta-mãe `site templum/` NÃO é repo).
3. **`git push origin main` = DEPLOY EM PRODUÇÃO** (Workers Builds publica). Só pushe quando
   quiser publicar de fato. Em dúvida, faça `git status` / `git diff` antes.
4. **Sempre rode `npm run build` antes de pushar** — se o build quebra local, o deploy quebra.
5. **NUNCA commite:** `service_role`/secrets, `.env`, o export do WordPress
   (`blog-certificacaoiso/*.WordPress*.xml`, ~58MB), dumps, `node_modules`, `dist`.
6. **Mensagem de commit** (quando for IA): terminar com
   `Co-Authored-By: Claude <noreply@anthropic.com>`.
7. **Se a `main` rejeitar push** (“fetch first”): alguém pushou antes →
   `git pull --rebase origin main` e push de novo.
8. **Dados do Supabase** (posts/iscas/etc.): não é git — é SQL no Supabase. Os `.sql` no repo
   são só histórico/referência.

---

## 7. Estrutura de pastas (cada projeto Astro)

```
src/
  pages/        # rotas (.astro) → URLs
  components/   # componentes reutilizáveis
  layouts/      # Base.astro (head, SEO, tracking, fontes)
  styles/       # tokens.css + global.css (design system) + fonts.css
  lib/          # camada de dados (ex.: posts.js lê Supabase no build)
  data/         # dados estáticos (normas, categorias, iscas do site…)
public/         # assets servidos como estão (/assets, /wp-content, /fonts)
supabase/       # (só no blog) schema.sql, seeds, Edge Functions, scripts de import
worker.js       # Worker da Cloudflare (serve dist + regras)
wrangler.toml   # config do Worker
```

- **Design system:** `src/styles/` + (no site) a página `/design-system` é a fonte da verdade visual.
  Identidade: Montserrat; laranja `#FF5925`, navy `#222831`, creme `#FFFAEB`; cada norma tem cor própria.

---

## 8. Convenções & aprendizados (gotchas)

- **webp:** o `sips` do macOS não gera webp — usar **`cwebp`** (`/opt/homebrew/bin`).
- **`<style>` em `.astro`:** não colocar expressões `{...}` dentro (quebra o build).
- **Conteúdo injetado por JS** (ex.: comentários client-side) **não** recebe estilo *scoped* do
  Astro → usar `<style is:global>`.
- **`overflow-x: clip`** (não `hidden`) no html/body — `hidden` quebra `position: sticky`.
- **Tracking** (Clarity/GA4/Ads/tracking-kit): carregado **só na 1ª interação** (defer) →
  performance. Não voltar a carregar eager no `<head>`.
- **Imagens:** `width`/`height` + `loading`/`decoding`; imagem de LCP com `fetchpriority="high"` + preload.
- **Fontes:** Montserrat self-hosted, `font-display: optional` + preload dos pesos usados above-the-fold.
- **Iscas** (`/presentes/<slug>`): conteúdo rico em `blog_templum_iscas`; landing igual ao site.
- **Comentários:** visitante envia → `pending` → aprova no CMS → aparece (client-side, sem rebuild).

---

## 9. Pendências conhecidas (estado atual)

- **Go-live:** domínios já apontam para os Workers novos. Conferir redirects/404 e Search Console.
- **Deploy Hook (“Republicar site”):** depende do secret `CLOUDFLARE_DEPLOY_HOOK_URL` na Edge
  Function `blog-templum-rebuild` (criar o hook no Worker do blog e colar a URL).
- **Tracking real:** preencher os IDs de pixel (Meta/GA4/Ads) e secrets do Mailchimp no painel.
- **Conteúdo:** alguns posts antigos têm títulos longos / parágrafos longos (qualidade editorial).
