# Como trabalhar no dia a dia (guia rápido — Cursor)

Guia para quem vai mexer no código. Vale para os **3 repositórios** (site, blog, cms).
Arquitetura técnica → `ARQUITETURA.md`. Regras que a IA segue → `CLAUDE.md` / `.cursorrules`.

---

## ⚠️ As 3 regras de ouro

1. **Cada projeto é um repositório SEPARADO** (site, blog, cms). Trabalhe **dentro do repo certo**.
2. **“Publicar” (push) = vai pro ar AUTOMÁTICO** (produção, ~1–2 min). Só publique com certeza.
3. **Antes de publicar, teste local com `npm run build`.** Se quebra local, quebra no ar.

---

## 1. Sempre que for começar: ATUALIZE (pull)

O clone **NÃO** atualiza sozinho. Pra pegar o que os outros subiram:

- **No Cursor:** ícone **Source Control** na barra lateral (parece um “ramo”/Y) →
  botão **Sync / Pull** (setinhas ↻). Clica e pronto.
- **No terminal:** `git pull`

> Faça isso **antes** de editar qualquer coisa — evita conflito.

## 2. Rodar o projeto na sua máquina

No Cursor, abra o terminal (atalho **Ctrl + `**) e:

```bash
npm install     # só na primeira vez
npm run dev     # abre em http://localhost:... (edite e veja ao vivo)
```

## 3. Quando terminar: salvar e publicar (commit + push)

1. **Teste:** `npm run build` (tem que terminar sem erro).
2. **No Cursor → Source Control:**
   - escreva uma **mensagem** curta do que mudou;
   - clique **Commit**;
   - clique **Sync / Push** → sobe pro GitHub e **publica no ar**.
3. **Ou no terminal:**
   ```bash
   git add -A
   git commit -m "o que mudou"
   git push
   ```

## 4. Se aparecer “conflito” (conflict)

Quer dizer que você e outra pessoa mexeram na mesma parte. **Não force.**
- Veja com `git status`.
- Resolva com calma — ou peça pra IA do Cursor: *“me ajuda a resolver esse conflito de git”*.

## 5. Onde NÃO mexer / o que NUNCA subir

- **Nunca suba:** `.env`, senhas, `service_role` (chave secreta do Supabase),
  `node_modules`, `dist`, arquivos pesados (ex.: o export do WordPress).
- **Não troque** domínio/rota dos Workers da Cloudflare sem entender —
  pode derrubar o `/acesso` (CMS).
- **Conteúdo** (posts, iscas, comentários, histórias) **não é código** —
  fica no **Supabase** e é editado pelo **CMS** (`/acesso`), não pelo git.

---

## Resumo visual

```
   git pull            editar + npm run dev          npm run build
  (atualiza)  ───►   (mexe e vê ao vivo)   ───►   (testa)  ───►  commit + push
                                                                   = NO AR (produção)
```

**Em uma frase:** *puxa antes (pull), testa o build, e só dá push quando quiser publicar — no repositório certo.*
