/**
 * Gera intervalo-e0-ac-only.json para update_crm_automation (grafo + branch_paths com HTML atual).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const graphPatch = JSON.parse(
  readFileSync(join(root, "scripts/intervalo-e0-graph-patch.json"), "utf8"),
);

const html = readFileSync(
  join(root, "scripts/intervalo-e0-email-body.html"),
  "utf8",
).trim();

const subject =
  "Vaga confirmada | Gestão Financeira com IA na Prática, 20/10 às 16h";
const emailCfg = {
  module: "crm",
  operation: "send_mailbox_email",
  action_type: "send_mailbox_email",
  pipeline_id: graphPatch.pipeline_id,
  capabilityId: "action.crm.send_mailbox_email",
  recipient_mode: "from_trigger",
  email_subject_override: subject,
  email_body_html: html,
};

const EMAIL_ID = "e8f3c17f-8ada-49b4-925e-6047e0bce578";
const emailNode = graphPatch.action_config.fluxos_graph.nodes.find((n) =>
  n.id.startsWith("e8f3"),
);
emailNode.data.config = { ...emailCfg };

graphPatch.action_config.branch_paths.intervalo[0].config = emailCfg;
graphPatch.branch_paths.intervalo[0].action_config = {
  recipient_mode: "from_trigger",
  email_subject_override: subject,
  email_body_html: html,
};

const payload = {
  id: graphPatch.id,
  trigger_type: graphPatch.trigger_type,
  pipeline_id: graphPatch.pipeline_id,
  cooldown_hours: graphPatch.cooldown_hours,
  is_active: graphPatch.is_active,
  action_type: "webhook",
  condition_branches: graphPatch.condition_branches,
  branch_paths: graphPatch.branch_paths,
  action_config: {
    fluxos_graph: graphPatch.action_config.fluxos_graph,
    branch_paths: graphPatch.action_config.branch_paths,
  },
};

const out = join(root, "scripts/intervalo-e0-ac-only.json");
writeFileSync(out, JSON.stringify(payload));
console.log("wrote", out, JSON.stringify(payload).length, "bytes");
