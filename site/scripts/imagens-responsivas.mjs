// Gera as variantes de largura das fotos de norma (/assets/img/consultoria/).
// Roda: node scripts/imagens-responsivas.mjs
//
// Por que existe (medido em 10/09/2026, PageSpeed da home): os arquivos são 1169x1600 e
// eram servidos assim em TODO slot — no card do carrossel eles aparecem a 368x460 no
// celular e a no máximo 320 CSS px no desktop. Só a home desperdiçava 367,5 KB de
// imagem própria; o desktop chegava a 832 KB.
//
// Larguras escolhidas pelos slots reais:
//   400  → card do carrossel no desktop (clamp 260–320 CSS px, DPR 1) e celular pequeno
//   740  → card no celular a 368 CSS px em DPR 2 (o caso mais comum)
//   original (1169) → hero da página da norma (.ph-media, coluna grande) e telas densas
//
// O <Image> do astro:assets NÃO serve aqui: o caminho é montado em runtime a partir do
// slug da norma (`/assets/img/consultoria/${slug}.webp`), e ele exige import estático.
// Por isso variante por sufixo no nome + srcset montado por string no componente.
import { readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIR = "public/assets/img/consultoria";
const LARGURAS = [400, 740];

// Fotos fora da pasta de consultoria que também eram servidas em tamanho único.
// Medido em 10/09/2026 (Lighthouse pós-deploy): a do hero desperdiçava 28 KiB no
// celular e 38 KiB no desktop, e a da Olívia 53 KiB — as duas maiores sobras que
// restaram depois do srcset das normas. O hero é o ELEMENTO LCP da home: encolher a
// variante que o celular baixa é ganho direto de LCP, não só de bytes.
const AVULSAS = [
  ...readdirSync("public/assets/img/hero").filter((f) => f.endsWith(".webp") && !/-\d{3,4}\.webp$/.test(f))
    .map((f) => ({ src: `public/assets/img/hero/${f}`, larguras: [900] })),
  { src: "public/assets/img/olivia_templum.webp", larguras: [420] },
];
const kb = (n) => String(Math.round(n / 1024)).padStart(4);

// O padrão da variante precisa citar as larguras: `-\d+` sozinho casaria com
// iso-9001.webp, fssc-22000.webp e todas as normas cujo nome termina em número —
// elas ficaram de fora na primeira execução e o erro só apareceu na conferência.
const RE_VARIANTE = new RegExp(`-(${LARGURAS.join("|")})\\.webp$`);
const originais = readdirSync(DIR).filter((f) => f.endsWith(".webp") && !RE_VARIANTE.test(f));
let antes = 0, depois = 0;
for (const f of originais) {
  const src = `${DIR}/${f}`;
  const base = f.replace(/\.webp$/, "");
  antes += statSync(src).size;
  for (const w of LARGURAS) {
    const out = `${DIR}/${base}-${w}.webp`;
    // -q 78: acima disso o ganho visual some e o arquivo cresce; -resize W 0 mantém proporção.
    execFileSync("cwebp", ["-quiet", "-q", "78", "-resize", String(w), "0", src, "-o", out]);
    const s = statSync(out).size; depois += s;
    console.log(`${kb(statSync(src).size)}KB → ${kb(s)}KB  ${w}px  ${out.replace("public", "")}`);
  }
}
for (const a of AVULSAS) {
  const base = a.src.replace(/\.webp$/, "");
  for (const w of a.larguras) {
    const out = `${base}-${w}.webp`;
    execFileSync("cwebp", ["-quiet", "-q", "78", "-resize", String(w), "0", a.src, "-o", out]);
    console.log(`${kb(statSync(a.src).size)}KB → ${kb(statSync(out).size)}KB  ${w}px  ${out.replace("public", "")}`);
  }
}
console.log(`\n${originais.length} fotos × ${LARGURAS.length} larguras + ${AVULSAS.length} avulsas · originais ${kb(antes)}KB → variantes ${kb(depois)}KB`);
