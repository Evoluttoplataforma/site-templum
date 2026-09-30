# Campanhas de LP → funil MQL

## Estratégia comercial (a partir das campanhas no JSON)

Inscrições de **eventos e LPs de campanha** cadastradas em `config/mql-campaigns.json`:

1. **Entram no funil MQL** (etapa Novo Lead), com **tags do evento**.
2. **Nutrição** (e-mail, WhatsApp, Fluxos, Mailchimp/ManyChat) até qualificação.
3. **Handoff manual ou automação no Orbit** → funil **Inbound** quando virarem oportunidade (**SQL**).

Não misturar com INBOUND na inscrição: evita inflar perda e mantém o MQL como fila de eventos.

### Legado (não alterar)

Fluxos que **já existiam** continuam como estão:

- Webinars ISO (`webinar-*`) → edge `upsert-webinar-mql`
- Webserie, PE2027, iscas `/presentes/`, formulários comerciais genéricos → INBOUND/Pipedrive ou regras próprias
- Cards e histórico já criados no CRM

Campanhas **novas** (template + JSON) seguem só o caminho MQL acima.

## Fonte única

Arquivo: `config/mql-campaigns.json`

| Campo | Uso |
|-------|-----|
| `key` | Identificador interno (ex.: `intervalo_gf_2026_11`) |
| `slug` | Campo `evento` no POST `/api/lead` |
| `lpPath` | Rota da LP (validada no build) |
| `crmTags` | Etiquetas no Orbit (máx. 32 caracteres cada) |
| `crmSource` | Origem do lead no CRM |
| `titleStyle` | `contact` (só nome) ou `empresa_suffix` |
| `titleSuffix` | Com `empresa_suffix`, sufixo do título do card |
| `notes` | Nota inicial no card (opcional) |
| `customFields` | `true` se cargo/desafio/UTM vão aos campos personalizados |
| `manychatTags` / `mailchimpTags` | Nutrição (opcional; padrão: `crmTags`) |
| `fluxos.e0InboundPathKey` | Webhook pós-inscrição (opcional) |

Worker importa o JSON. LPs usam `mqlCampaignSlug("sua_key")` em `src/lib/mql-campaigns.ts`.

## Template de LP

| Arquivo | Uso |
|---------|-----|
| `src/pages/_templates/campanha-mql.astro` | Copiar para `src/pages/<rota>.astro` |
| `src/pages/_templates/obrigado-campanha-mql.astro` | Copiar para `obrigado-<rota>.astro` |
| `src/components/CampanhaMqlForm.astro` | Formulário MQL (dois blocos na página) |
| `src/pages/gestao-financeira.astro` | Referência visual (outubro/2026) |
| `src/styles/gestao-financeira.css` | Estilo Academia de Combate (copiar ou estender) |

Pastas `_templates` **não geram URL** no build.

## Checklist: nova campanha

1. Entrada em **`config/mql-campaigns.json`** (copiar campanha parecida; atualizar `lpPath`).
2. Duplicar template → ajustar copy, assets, `CAMPAIGN_KEY`, `OBRIGADO`.
3. **Orbit:** automação `lead_created` no MQL (e Fluxos de nutrição); SQL = mover para Inbound quando qualificado.
4. `npm run build` (valida JSON + LP).
5. Deploy (`main`).

## Worker

- Slugs do JSON entram em `isInscricaoEvento` (sem Pipedrive/INBOUND na inscrição).
- `saveToMqlInscricao`: dedup **só no MQL**; senão cria Novo Lead com tags na criação.
