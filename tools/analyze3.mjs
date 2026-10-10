import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ds = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"));
const w = [97, 70, 91, 7, 73, 21, 19, 66, 51, 95]; // d=1..10
const mod = (a) => ((a % 100) + 100) % 100;

function v(c) {
  const code = c.charCodeAt(0);
  let idx;
  if (code >= 48 && code <= 57) idx = code - 49; // '1'->0
  else if (code >= 65 && code <= 90) idx = code - 65;
  else if (code >= 97 && code <= 122) idx = code - 97;
  else return null;
  let val = ((idx % 17) + 17) % 17;
  if (val > 8) val -= 17;
  return val;
}

const rows = [];
for (const d of ds) {
  const s = d.prefix;
  if (!/^CONSULTA;.$/.test(s)) continue;
  const chars = [...s];
  const L = chars.length;
  let rest = 0;
  let ok = true;
  for (let i = 0; i < L; i++) {
    const dist = L - i;
    const ch = chars[i];
    if (ch === ";") continue;
    const val = v(ch);
    if (val === null || dist > 10) { ok = false; break; }
    rest += val * w[dist - 1];
  }
  if (!ok) continue;
  const control = Number(d.passing[0].control);
  rows.push({ s, control, k2: mod(control - rest) }); // = K + v(';')*w2
}
console.log("char  ctrl   K+ v(;)*w2");
for (const r of rows) console.log(`${r.s.padEnd(12)} ${String(r.control).padStart(3)}  ${r.k2}`);
