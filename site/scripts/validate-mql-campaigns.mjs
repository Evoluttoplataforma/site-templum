/**
 * Valida config/mql-campaigns.json antes do build.
 * Garante slugs únicos, tags CRM ≤32 chars e LP registrada quando lpPath existe.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(root, "config", "mql-campaigns.json");
const raw = JSON.parse(readFileSync(configPath, "utf8"));
const campaigns = raw.campaigns || [];

const errors = [];
const slugs = new Set();
const keys = new Set();

for (const c of campaigns) {
  if (!c.key || !c.slug) {
    errors.push("Campanha sem key ou slug");
    continue;
  }
  if (keys.has(c.key)) errors.push(`key duplicada: ${c.key}`);
  keys.add(c.key);
  if (slugs.has(c.slug)) errors.push(`slug duplicado: ${c.slug}`);
  slugs.add(c.slug);
  if (!Array.isArray(c.crmTags) || !c.crmTags.length) {
    errors.push(`${c.slug}: crmTags vazio`);
  }
  for (const tag of c.crmTags || []) {
    if (String(tag).length > 32) {
      errors.push(`${c.slug}: tag CRM > 32 chars: "${tag}"`);
    }
  }
  if (!c.crmSource) errors.push(`${c.slug}: falta crmSource`);
  if (c.lpPath) {
    const page =
      c.lpPath === "/"
        ? join(root, "src", "pages", "index.astro")
        : join(root, "src", "pages", c.lpPath.replace(/^\//, "").replace(/\/$/, "") + ".astro");
    if (!existsSync(page)) {
      errors.push(`${c.slug}: lpPath ${c.lpPath} sem ${page.replace(root + "\\", "")}`);
    }
  }
}

if (errors.length) {
  console.error("[validate-mql-campaigns] Falhou:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

console.log(`[validate-mql-campaigns] OK (${campaigns.length} campanha(s) MQL)`);
