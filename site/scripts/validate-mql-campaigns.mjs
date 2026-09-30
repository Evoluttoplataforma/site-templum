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
  const fx = c.fluxos;
  if (fx?.e0InboundPathKey) {
    if (!String(fx.e0PrimaryTag || "").trim()) {
      errors.push(`${c.slug}: fluxos.e0PrimaryTag obrigatório com e0InboundPathKey`);
    }
    if (!String(fx.e0SentTag || "").trim()) {
      errors.push(`${c.slug}: fluxos.e0SentTag obrigatório com e0InboundPathKey`);
    } else if (String(fx.e0SentTag).length > 32) {
      errors.push(`${c.slug}: fluxos.e0SentTag > 32 chars`);
    }
  }
  if (c.lpPath) {
    const page =
      c.lpPath === "/"
        ? join(root, "src", "pages", "index.astro")
        : join(root, "src", "pages", c.lpPath.replace(/^\//, "").replace(/\/$/, "") + ".astro");
    if (!existsSync(page)) {
      errors.push(`${c.slug}: lpPath ${c.lpPath} sem ${page.replace(root + "\\", "")}`);
    }
    const utm = c.utmDefaults;
    if (!utm || typeof utm !== "object") {
      errors.push(`${c.slug}: falta utmDefaults (obrigatório com lpPath)`);
    } else {
      for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
        if (!String(utm[k] || "").trim()) {
          errors.push(`${c.slug}: utmDefaults.${k} vazio`);
        }
      }
      if (utm.utm_campaign && utm.utm_campaign !== c.slug) {
        errors.push(
          `${c.slug}: utmDefaults.utm_campaign deve ser igual ao slug ("${c.slug}")`,
        );
      }
    }
  }
}

if (errors.length) {
  console.error("[validate-mql-campaigns] Falhou:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}

console.log(`[validate-mql-campaigns] OK (${campaigns.length} campanha(s) MQL)`);
