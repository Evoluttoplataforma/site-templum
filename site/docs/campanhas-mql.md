# Campanhas de LP → funil MQL

Processo **repetível**: tudo parte de `config/mql-campaigns.json`; o build valida; LP + Worker aplicam UTMs da campanha na conversão.

## Estratégia comercial

Inscrições cadastradas no JSON:

1. **Funil MQL** (Novo Lead) + **tags do evento**
2. Nutrição (e-mail, WhatsApp, Fluxos, Mailchimp/ManyChat)
3. Handoff → **Inbound** quando virar SQL

Não enviar inscrição de evento direto ao INBOUND.

### Legado (não alterar)

- Webinars `webinar-*` → edge `upsert-webinar-mql`
- PE2027, iscas, formulário comercial → regras próprias
- Campanhas **novas** (template + JSON) → só MQL

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
| `mqlDedupOpenLead` | Default `true`: mesmo e-mail com card aberto no MQL → PATCH (não duplica lead) |

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
| Pesquisa | URL no E0 com `?email={contact_email}&lead_id={id}` (ver `survey` no JSON da campanha). Campos ocultos na pesquisa só **antes** da 1ª resposta; se já houver resposta, duplicar iteração no Orbit. |

### Pesquisa pública ↔ lead (rastreio)

1. Cadastre `survey.publicUrl` + params no `mql-campaigns.json`.
2. No E0, o botão usa e-mail e id do lead (merge da caixa Orbit).
3. Na pesquisa Orbit: perguntas ocultas `email_inscricao` e `lead_id` com prefill da query (ou nova iteração se já existir resposta).
4. Conferência: resposta no Orbit deve mostrar e-mail igual ao `contact_email` do card MQL.

Automação GF: `eb0a9536-7037-48fe-8b1c-f1a828d499ae` · gatilho **`webhook_inbound`** · path `wh_1a3cf478c5404112` (ver `get_crm_inbound_webhooks`) · cooldown 24h · sent tag `e0:intervalo-gf-2026:enviado`.

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
- Slugs do JSON → `isInscricaoEvento` → `saveToMqlInscricao` (**somente funil MQL**, sem INBOUND).
- Dedup: cards **abertos no MQL** com o mesmo e-mail (padrão).
- E0: após CRM ok, Worker POST no **webhook inbound** (`fluxos.e0InboundPathKey`); secret `INTERVALO_E0_FLUXOS_SECRET` ou `MQL_E0_WEBHOOK_SECRETS`.
- Pula webhook se `e0SentTag` já estiver no lead (re-inscrição).
- `applyMqlLpAttribution(lead)` na conversão quando `pagina` = `lpPath` da campanha.
