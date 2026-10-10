import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { reset, probe } from "./recon.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "weights.json");
const mod = (a) => ((a % 100) + 100) % 100;

const N = 20;
const A = "A".repeat(N);

async function crack(str) {
  const seq = `w:${str}`;
  await reset(seq);
  for (let n = 0; n <= 99; n++) {
    const r = await probe({ seq, hipotesis: `weight probe`, m: `${str};${n}` });
    if (!(r.json && r.json.error === "E202")) return n;
  }
  return null;
}

const base = `CONSULTA;${A}`;
const c0 = await crack(base);
console.log(`base control = ${c0}`);

const weights = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};
for (let k = 1; k <= 10; k++) {
  const dist = N - k + 1;
  if (weights[dist] !== undefined) continue;
  const payload = A.slice(0, k - 1) + "B" + A.slice(k);
  const c = await crack(`CONSULTA;${payload}`);
  weights[dist] = mod(c - c0);
  writeFileSync(OUT, JSON.stringify(weights, null, 0));
  console.log(`w${dist} = ${weights[dist]}  (control ${c})`);
}
console.log("done");
