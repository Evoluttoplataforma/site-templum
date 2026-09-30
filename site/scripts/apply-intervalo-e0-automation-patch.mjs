/**
 * Aplica intervalo-e0-automation-patch.json via Orbit MCP (rodar manualmente se necessário).
 * Uso: ORBIT_MCP=1 node apply-intervalo-e0-automation-patch.mjs
 */
import { readFileSync } from "node:fs";

const patch = JSON.parse(
  readFileSync(new URL("./intervalo-e0-automation-patch.json", import.meta.url), "utf8"),
);
console.log(JSON.stringify(patch, null, 2));
