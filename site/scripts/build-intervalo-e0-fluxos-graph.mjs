/**
 * Gera action_config.fluxos_graph ligado: webhook inbound → condições → e-mail → tag enviado.
 * Saída: intervalo-e0-graph-patch.json (update_crm_automation via MCP ou apply script).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const campaigns = JSON.parse(
  readFileSync(join(root, "config/mql-campaigns.json"), "utf8"),
).campaigns;
const gf = campaigns.find((c) => c.key === "intervalo_gf_2026_10");
const E0_PRIMARY_TAG = gf?.fluxos?.e0PrimaryTag || "intervalo técnico";
const E0_SENT_TAG = gf?.fluxos?.e0SentTag || "e0:intervalo-gf-2026:enviado";

const AUTO_ID = "eb0a9536-7037-48fe-8b1c-f1a828d499ae";
const PIPELINE = "519a684f-c522-4aeb-b14d-371986de41c6";
const EMAIL_ID = "e8f3c17f-8ada-49b4-925e-6047e0bce578";
const SENT_TAG_ID = "action_e0_sent_tag_gf";
const TRIGGER_ID = "trigger_1_e0gf";
const COND_ID = "condition_1_e0gf";

const html = readFileSync(
  join(root, "scripts/intervalo-e0-email-body.html"),
  "utf8",
).trim();

const emailConfig = {
  module: "crm",
  operation: "send_mailbox_email",
  action_type: "send_mailbox_email",
  pipeline_id: PIPELINE,
  capabilityId: "action.crm.send_mailbox_email",
  recipient_mode: "from_trigger",
  email_subject_override:
    "Vaga confirmada | Gestão Financeira com IA na Prática, 20/10 às 16h",
  email_body_html: html,
};

const sentTagConfig = {
  module: "crm",
  operation: "update_field",
  action_type: "update_field",
  pipeline_id: PIPELINE,
  capabilityId: "action.crm.update_field",
  field_name: "tags",
  field_value: E0_SENT_TAG,
};

const branches = [
  {
    id: "opt_out",
    label: "contém email-opt-out",
    logic: "AND",
    rules: [{ field: "tags", operator: "contains", value: "email-opt-out" }],
  },
  {
    id: "intervalo",
    label: "inscrição Intervalo Técnico",
    logic: "AND",
    rules: [
      { field: "tags", operator: "contains", value: E0_PRIMARY_TAG },
      { field: "tags", operator: "not_contains", value: E0_SENT_TAG },
    ],
  },
];

const intervaloSteps = [
  {
    id: EMAIL_ID,
    type: "send_mailbox_email",
    config: emailConfig,
  },
  {
    id: SENT_TAG_ID,
    type: "update_field",
    config: sentTagConfig,
  },
];

const branch_paths = {
  opt_out: [],
  else: [],
  intervalo: intervaloSteps,
};

const fluxos_graph = {
  nodes: [
    {
      id: TRIGGER_ID,
      type: "trigger",
      position: { x: 80, y: 200 },
      data: {
        kind: "trigger",
        title: "Webhook de entrada",
        subtitle: "Inscrição LP (site)",
        simStatus: "idle",
        config: {
          event: "webhook_inbound",
          trigger_type: "webhook_inbound",
          pipeline_id: PIPELINE,
          cooldown_hours: 24,
          is_active: true,
          capabilityId: "trigger.crm.webhook_inbound",
          sourceAutomationId: AUTO_ID,
          sourceAutomationName: "Intervalo Técnico GF 2026 | E0 confirmação + pesquisa",
        },
      },
    },
    {
      id: COND_ID,
      type: "condition",
      position: { x: 360, y: 200 },
      data: {
        kind: "condition",
        title: "tags",
        subtitle: "2 ramos",
        simStatus: "idle",
        outputs: [
          { id: "opt_out", label: "contém email-opt-out" },
          { id: "intervalo", label: "inscrição Intervalo Técnico" },
          { id: "else", label: "Nenhuma condição" },
        ],
        config: {
          mode: "multi",
          logic: "AND",
          version: 3,
          branches,
          pipeline_id: PIPELINE,
          capabilityId: "logic.condition",
          subtitleText: "2 ramos",
          sourceAutomationId: AUTO_ID,
          sourceAutomationName: "Intervalo Técnico GF 2026 | E0 confirmação + pesquisa",
          rules: branches[0].rules,
        },
      },
    },
    {
      id: EMAIL_ID,
      type: "action",
      position: { x: 680, y: 120 },
      data: {
        kind: "action",
        title: "Enviar e-mail (caixa)",
        subtitle: "HTML E0 confirmação",
        simStatus: "idle",
        config: emailConfig,
      },
    },
    {
      id: SENT_TAG_ID,
      type: "action",
      position: { x: 980, y: 120 },
      data: {
        kind: "action",
        title: "Marcar E0 enviado",
        subtitle: E0_SENT_TAG,
        simStatus: "idle",
        config: sentTagConfig,
      },
    },
  ],
  edges: [
    {
      id: `e_${TRIGGER_ID}_${COND_ID}`,
      type: "smoothstep",
      source: TRIGGER_ID,
      target: COND_ID,
      sourceHandle: "out",
    },
    {
      id: `e_${COND_ID}_${EMAIL_ID}_intervalo`,
      type: "smoothstep",
      source: COND_ID,
      target: EMAIL_ID,
      sourceHandle: "intervalo",
    },
    {
      id: `e_${EMAIL_ID}_${SENT_TAG_ID}`,
      type: "smoothstep",
      source: EMAIL_ID,
      target: SENT_TAG_ID,
      sourceHandle: "out",
    },
  ],
};

const payload = {
  id: AUTO_ID,
  trigger_type: "webhook_inbound",
  pipeline_id: PIPELINE,
  cooldown_hours: 24,
  is_active: true,
  action_type: "webhook",
  condition_branches: branches,
  branch_paths: {
    opt_out: [],
    else: [],
    intervalo: [
      {
        action_type: "send_mailbox_email",
        action_config: {
          recipient_mode: "from_trigger",
          email_subject_override: emailConfig.email_subject_override,
          email_body_html: html,
        },
      },
      {
        action_type: "update_field",
        action_config: {
          field_name: "tags",
          field_value: E0_SENT_TAG,
        },
      },
    ],
  },
  action_config: {
    branch_paths,
    fluxos_graph,
  },
};

const out = join(root, "scripts/intervalo-e0-graph-patch.json");
writeFileSync(out, JSON.stringify(payload));
console.log(
  "wrote",
  out,
  "nodes",
  fluxos_graph.nodes.length,
  "edges",
  fluxos_graph.edges.length,
  "bytes",
  JSON.stringify(payload).length,
);
