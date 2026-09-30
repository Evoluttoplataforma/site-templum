/**
 * Publica intervalo-e0-ac-only.json no Orbit (HTML + grafo + branch_paths).
 * Uso: node scripts/apply-intervalo-e0-ac-only.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const patch = JSON.parse(
  readFileSync(join(root, "scripts/intervalo-e0-ac-only.json"), "utf8"),
);

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
  body: JSON.stringify(patch),
});
const text = await res.text();
console.log(res.status, text.slice(0, 400));
if (!res.ok) process.exit(1);
