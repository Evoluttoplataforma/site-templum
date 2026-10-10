# Campanhas de LP → funil MQL

Processo **repetível**: tudo parte de `config/mql-campaigns.json`; o build valida; LP + Worker aplicam UTMs da campanha na conversão.

## Estratégia comercial

Inscrições cadastradas no JSON:

1. **Funil MQL** (Novo Lead) + **tags do evento**
2. Nutrição (e-mail, WhatsApp, Fluxos, Mailchimp/ManyChat)
3. Handoff → **Inbound** quando virar SQL

Não enviar inscrição de evento direto ao INBOUND.

- Webinars `webinar-*` → **`saveToMqlWebinar`** no Worker (mesma chave `ORBIT_CRM_API_KEY` das campanhas)
- PE2027, iscas, formulário comercial → regras próprias
- Campanhas **novas** (template + JSON) → só MQL

## Webinars (`evento` começa com `webinar`)

Regra de produto (out/2026): **um card MQL aberto por contato**, participação acumulada em **tags + notas**, sem mandar webinar para INBOUND.

### Funil e origem

| Item | Valor |
|------|--------|
| Funil | **MQL** (`519a684f-c522-4aeb-b14d-371986de41c6`) |
| Etapa na criação | **Novo Lead** |
| Origem no CRM | `Webinar ISO 9001` |
| Tag da série | `webinar 9001:2026` (fixa enquanto durar a série) |
| Tag do evento | igual ao campo `evento` da LP (ex.: `webinar-foco-cliente-1410`), **máx. 32 caracteres** |

Mailchimp e ManyChat seguem o fluxo normal do Worker; CRM webinar **não** usa Pipedrive nem funil INBOUND.

### Dedup (quando reutiliza o mesmo card)

1. Busca lead por **e-mail** (e por **telefone**, se bater 10+ dígitos).
2. **Reutiliza** só card **aberto** no funil **MQL** (PATCH: soma tags, append de nota, UTMs/página da última conversão nos CFs).
3. Se **não** houver card MQL aberto → **POST** novo card em Novo Lead.

### Quando pode existir mais de um card MQL (comportamento esperado)

| Situação | O que acontece |
|----------|----------------|
| Card MQL anterior **ganho, perdido ou fechado** | Próxima inscrição **cria novo** card MQL |
| Só existe card aberto em **outro funil** (ex.: INBOUND) | **Cria** card no MQL (webinar não reutiliza fora do MQL) |
| E-mails diferentes ou typo | Dois cards |
| Slug `evento` **> 32 caracteres** | Tag do evento **não** entra no CRM; a nota ainda traz o `evento` completo |

Não prometer “nunca duplica”: prometer **no máximo um card MQL aberto reaproveitado** enquanto o negócio estiver aberto no MQL.

### Histórico no card

- **Tags:** cada live soma a tag do `evento` (e mantém `webinar 9001:2026`).
- **Notas:** bloco por inscrição (`Webinar ISO 9001: …`, página, UTM); re-inscrição **append** se o texto for novo.
- **Campos personalizados:** refletem a **última** conversão (página, cargo, UTMs), não uma lista histórica.
- **Timeline** do Orbit (e-mails Fluxos, mudança de etapa): vem das automações, não do PATCH de inscrição.

### Auditoria Supabase

Tabela `webinar_mql_sync` (1 linha por e-mail): `orbit_lead_id`, `action` (`created` | `tagged_mql`), `events`, `synced_at`. Fonte de verdade comercial = **tags e notas no card**.

### Backfill de inscrições antigas

- Edge `upsert-webinar-mql` (modos `backfill` / `pending_since`) ou script `site/scripts/sync-webinar-mql-pending.mjs`.
- Operacional no Worker: `GET /api/webinar-mql-backfill?token=LEADS_PASSWORD&limit=80` (repetir até zerar pendências).

### Checklist: nova live webinar

1. LP com `evento=webinar-…` (slug **≤ 32 chars** para tag CRM).
2. Tag Mailchimp / automação alinhada ao mesmo slug.
3. Após deploy do Worker, testar inscrição → card MQL Novo Lead + tags série + evento.
4. Re-inscrição de teste com **mesmo e-mail** → **mesmo** card, tag extra se for outro `evento`.

## Fonte única: `config/mql-campaigns.json`

| Campo | Uso |
|-------|-----|
| `key` | Identificador interno (ex.: `intervalo_gf_2026_10`) |
| `slug` | Campo `evento` no POST `/api/lead` |
| `lpPath` | Rota da LP (validada no build) |
| `utmDefaults` | **Obrigatório com `lpPath`**. Last-touch na conversão na LP |
| `crmTags` | Etiquetas Orbit (máx. 32 caracteres) |
| `crmSource` | Origem no CRM |
| `titleStyle` / `titleSuffix` | Título do card |
| `notes` | Nota inicial (opcional) |
| `customFields` | `true` → cargo, desafio, UTMs nos CFs |
| `manychatTags` / `mailchimpTags` | Nutrição (padrão: `crmTags`) |
| `fluxos.e0InboundPathKey` | Webhook inbound Orbit (Caminho C): Worker POST `{ lead_id }` após gravar no MQL |
| `fluxos.e0PrimaryTag` | Tag da campanha usada no Fluxos (condição de envio) |
| `fluxos.e0SentTag` | Tag aplicada após E0; re-inscrição não reenvia |
| `fluxos.automationId` | UUID da automação (referência) |
| `mqlDedupOpenLead` | Default `true`: mesmo e-mail com card aberto no funil de destino → PATCH (não duplica lead) |
| `crmDest` | `mql` (padrão) ou `lives`. Nova Era grava em LIVES / Novo inscrito |

### Regra de UTM (não pular)

```json
"utmDefaults": {
  "utm_source": "site",
  "utm_medium": "lp",
  "utm_campaign": "<igual ao slug>"
}
```

- **`utm_campaign` = `slug`** sempre (build falha se divergir).
- Tráfego pago ou e-mail com UTMs na **URL** da LP prevalece sobre defaults (query na barra de endereço).
- Sem UTMs na URL, o navegador **não** herda campanha antiga do `localStorage` (`CampanhaIsolada` + Worker `applyMqlLpAttribution`).

LP no Astro:

```astro
import { mqlCampaignLpProps } from "../lib/mql-campaigns";
const CAMPAIGN_KEY = "sua_key";
const { evento: EVENTO, utmDefaults: UTM_DEFAULTS } = mqlCampaignLpProps(CAMPAIGN_KEY);

<CampanhaIsolada leadEvento={EVENTO} utmDefaults={UTM_DEFAULTS} ...>
```

## Checklist: nova campanha

1. **JSON** — Copiar bloco de campanha parecida; ajustar `key`, `slug`, `lpPath`, `utmDefaults`, tags, `crmSource`.
2. **LP** — Copiar `_templates/campanha-mql.astro` + obrigado; `CAMPAIGN_KEY`; copy e assets.
3. **`lead-eventos.ts`** — Incluir `slug` se ainda não estiver na lista (quando aplicável).
4. **Orbit** — Automação `webhook_inbound` + inbound webhook (`path_key`), funil MQL, tags, opt-out, E0 (ver abaixo).
5. **`npm run build`** — `validate-mql-campaigns.mjs` + Astro.
6. **Deploy** — Site (`main`) + **Worker** (`worker.js` lê o JSON e UTMs).

## Checklist: E0 (confirmação de inscrição)

Referência GF: `scripts/intervalo-e0-crm-automation-reference.json`

| Passo | Comando / artefato |
|-------|-------------------|
| HTML do e-mail | `scripts/intervalo-e0-email-body.html` |
| Gerar patch Orbit | `node scripts/build-intervalo-e0-fluxos-graph.mjs` → `node scripts/build-intervalo-e0-ac-only.mjs` |
| Publicar automação | Orbit MCP `update_crm_automation` com `intervalo-e0-ac-only.json` **ou** `ORBIT_CRM_API_KEY=... node scripts/apply-intervalo-e0-ac-only.mjs` |
| Pesquisa | Botão do E0: `https://templum.com.br/gestao-financeira/pesquisa/?lead_id={id}`. O Worker faz PATCH no mesmo lead (`POST /api/pesquisa-gf`). |

### Pesquisa no card

1. `survey.publicUrl` no `mql-campaigns.json` aponta para `/gestao-financeira/pesquisa/`.
2. O E0 manda `lead_id={id}`. A página não pede nome, e-mail nem telefone.
3. `POST /api/pesquisa-gf` lê o lead, junta os 9 campos em `custom_fields` e acrescenta a tag `pesquisa-gf:respondida`. Não abre card novo.
4. O funil de módulo "Pesquisa E0 → CRM" foi excluído. As respostas entram no card pelo formulário do site.

Automação GF (E0 e-mail): `eb0a9536-7037-48fe-8b1c-f1a828d499ae` · gatilho **`webhook_inbound`** · path **`wh_d916fe011ef64d41`** · URL `https://cvanwvoddchatcdstwry.supabase.co/functions/v1/fluxos-webhook-inbound/wh_d916fe011ef64d41` (também na descrição da automação; o painel do gatilho não mostra o endereço) · POST `{ "lead_id": "<uuid do lead MQL>" }` + header **`X-Fluxos-Secret`** · cooldown **0** · sent tag `e0:intervalo-gf-2026:enviado`.

## Checklist: teste de inscrição

1. Aba anônima ou limpar `localStorage` (`tpl_last`) se quiser simular visitante novo.
2. Abrir `lpPath` **sem** query (ex.: `/gestao-financeira/`).
3. Enviar formulário.
4. No card MQL, conferir:
   - **Página de conversão** = `lpPath`
   - **utm_source** = `site`, **utm_medium** = `lp`, **utm_campaign** = `slug`
5. E0 recebido; re-inscrição no mesmo dia não repete se `e0SentTag` já no card.

## Template e referências

| Arquivo | Uso |
|---------|-----|
| `src/pages/_templates/campanha-mql.astro` | Copiar para `src/pages/<rota>.astro` |
| `src/pages/gestao-financeira.astro` | Referência completa (out/2026) |
| `src/layouts/CampanhaIsolada.astro` | UTM + formulário + Meta Lead |
| `src/lib/mql-campaigns.ts` | `mqlCampaignLpProps`, `mqlCampaignSlug` |
| `scripts/validate-mql-campaigns.mjs` | Roda no `npm run build` |

## Worker

- Importa `config/mql-campaigns.json`.
- `webinar-*` → `saveToMqlWebinar` (**ORBIT_CRM_API_KEY**, regras na seção Webinars acima).
- Slugs do JSON → `isInscricaoEvento` → `saveToMqlInscricao` (**somente funil MQL**, sem INBOUND).
- Dedup: cards **abertos no MQL** com o mesmo e-mail (padrão).
- E0: após CRM ok, Worker POST no **webhook inbound** (`fluxos.e0InboundPathKey`); secret `INTERVALO_E0_FLUXOS_SECRET` ou `MQL_E0_WEBHOOK_SECRETS`.
- Pula webhook se `e0SentTag` já estiver no lead (re-inscrição).
- `applyMqlLpAttribution(lead)` na conversão quando `pagina` = `lpPath` da campanha.
