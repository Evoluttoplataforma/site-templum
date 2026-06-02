---
name: anti-404
description: Garante que nenhuma URL antiga da Templum quebre. Use ao mapear/gerar redirects ou ao criar rotas, conferindo contra urls-templum.md.
---

# Anti-404 (mapeamento de URLs)

Objetivo: **nenhuma URL de `../urls-templum.md` pode dar 404** após sair do Framer.

## Passos
1. Ler `../urls-templum.md` (+200 URLs). Classificar cada uma:
   - **Página real** (tem conteúdo próprio) → criar rota em `site/src/pages/`.
   - **Variação/campanha** (`/lp/*`, `/lp-antigas/*`, `/ab/*`, `/ab-sn/*`, `/certificado/*`, `/consult/*`) → **redirect** para o canônico.
2. Editar `site/public/_redirects` (Cloudflare Pages). Sintaxe: `origem  destino  status`.
   - Use `302` enquanto a versão final não está no ar; trocar para `301` quando definitivo.
   - Regras específicas antes das genéricas. Splat: `/consult/*  /consultoria/:splat  301`.
3. Canônicos por norma: `/consultoria/<slug>` (ex.: iso-9001, iso-27001, pbqp-h…).
4. Toda família de uma norma (lp, certificado, ab, iso-xxxx) → cai no canônico daquela norma.
5. Conferir cobertura: cada linha de `urls-templum.md` precisa ter uma rota OU uma regra de redirect.
6. Página `404.html` (estática, com o DS) como rede de segurança — mas a meta é nunca cair nela.

## Verificação
Depois do build, validar amostras de URLs antigas (curl/preview) e revisar que nenhuma retorna 404.
