# CLAUDE.md — repositório do SITE (templum.com.br)

> Leia `ARQUITETURA.md` (neste repo) para o sistema completo (site · blog · cms · Supabase).
> Detalhes de marca/estilo do site estão em `.claude/CLAUDE.md`.

## Este repositório
- **App:** Site institucional da Templum — **`templum.com.br`**
- **Stack:** Astro estático · Worker Cloudflare **`site-templum`**
- **Remote:** `github.com/Evoluttoplataforma/site-templum`
- **Dev:** `npm run dev` · **Build:** `npm run build` · **Preview:** `npm run preview`

## ⚠️ Git & Deploy — regras (NÃO DAR ZIKA)
- Este repo publica **só o site**. Mudou blog/cms? É **outro repositório** — não commite aqui.
- **`git push origin main` = DEPLOY EM PRODUÇÃO** (Cloudflare Workers Builds). Só pushe pra publicar.
- **Antes de pushar:** `git status` + **`npm run build`** (se quebra local, quebra o deploy).
- Só commite/pushe quando o usuário pedir.
- **Nunca commitar:** `.env`, secrets, `service_role`, `node_modules`, `dist`.
- Commit de IA termina com: `Co-Authored-By: Claude <noreply@anthropic.com>`
- Push rejeitado (“fetch first”)? → `git pull --rebase origin main` e push de novo.

## Dados (Supabase)
- A home lê **artigos recentes** do Supabase no build (`src/lib/blog.js`) e o `/historias`
  lê `blog_templum_historias`. Schema/dados **não** vão por git — são geridos no Supabase.
