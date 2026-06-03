// Gera dist/sitemap.xml varrendo as páginas HTML construídas.
// Roda após `astro build` (ver package.json). À prova de versão do Astro.
import { readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SITE = "https://templum.com.br";
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const EXCLUDE = ["/design-system", "/404"];

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(walk(full));
    else if (name === "index.html") out.push(full);
  }
  return out;
}

const urls = walk(DIST)
  .map((f) => "/" + relative(DIST, f).replace(/index\.html$/, "").replace(/\/$/, ""))
  .map((u) => (u === "" ? "/" : u))
  .filter((u) => !EXCLUDE.some((e) => u === e || u.startsWith(e + "/")))
  .sort();

const body = urls
  .map((u) => `  <url><loc>${SITE}${u === "/" ? "/" : u + "/"}</loc></url>`)
  .join("\n");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

writeFileSync(join(DIST, "sitemap.xml"), xml);
console.log(`sitemap.xml: ${urls.length} URLs`);
