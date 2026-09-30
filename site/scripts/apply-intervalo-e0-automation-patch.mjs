/**
 * Aplica intervalo-e0-automation-patch.json via Orbit (rodar local com credencial).
 * Uso: node scripts/apply-intervalo-e0-automation-patch.mjs
 * Requer ORBIT_CRM_API_KEY no ambiente (mesma chave do Worker).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const patch = JSON.parse(
  readFileSync(join(root, "scripts/intervalo-e0-automation-patch.json"), "utf8"),
);
const body = {
  ...patch,
  trigger_type: "lead_created",
  cooldown_hours: 24,
  is_active: true,
  pipeline_id: "519a684f-c522-4aeb-b14d-371986de41c6",
};

const token = process.env.ORBIT_CRM_API_KEY;
if (!token) {
  console.error("Defina ORBIT_CRM_API_KEY no ambiente.");
  process.exit(1);
}

const base =
  process.env.ORBIT_CRM_API_BASE ||
  "https://cvanwvoddchatcdstwry.supabase.co/functions/v1/crm-api-v1/v1";

const res = await fetch(`${base}/automations/${patch.id}`, {
  method: "PATCH",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    accept: "application/json",
  },
  body: JSON.stringify(body),
});
const text = await res.text();
console.log(res.status, text.slice(0, 500));
if (!res.ok) process.exit(1);
