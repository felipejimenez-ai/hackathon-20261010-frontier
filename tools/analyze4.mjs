import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"))
  .filter((d) => d.prefix !== "PING" && d.passing.length === 1 && !d.prefix.endsWith(";"))
  .map((d) => ({ s: d.prefix, c: Number(d.passing[0].control) }));
const mod = (a) => ((a % 100) + 100) % 100;

const w = {1:97,2:70,3:91,4:7,5:73,6:21,7:19,8:66,9:51,10:95,11:47,12:85,13:44,14:52,15:35,16:59,17:8,18:83,19:24,20:46};

function vRule(c) {
  const code = c.charCodeAt(0);
  let idx;
  if (code >= 48 && code <= 57) idx = code - 49;
  else if (code >= 65 && code <= 90) idx = code - 65;
  else if (code >= 97 && code <= 122) idx = code - 97;
  else if (code === 45) return 0; // '-'
  else return null;
  let val = ((idx % 17) + 17) % 17;
  if (val > 8) val -= 17;
  return val;
}

const eqs = [];
for (const { s, c } of data) {
  const chars = [...s];
  const L = chars.length;
  if (L > 20) continue;
  let known = 0, cSemi = 0, cDash = 0, ok = true;
  for (let i = 0; i < L; i++) {
    const dist = L - i;
    const ch = chars[i];
    const wt = w[dist];
    if (wt === undefined) { ok = false; break; }
    if (ch === ";") { cSemi += wt; continue; }
    if (ch === "-") { cDash += wt; continue; }
    const val = vRule(ch);
    if (val === null) { ok = false; break; }
    known += val * wt;
  }
  if (!ok) continue;
  eqs.push({ s, c, known, cSemi, cDash });
}
console.log(`equations (len<=20): ${eqs.length}`);

const hits = [];
for (let vs = 0; vs < 100; vs++) {
  for (let vd = 0; vd < 100; vd++) {
    const e0 = eqs[0];
    const K = mod(e0.c - e0.known - e0.cSemi * vs - e0.cDash * vd);
    let ok = true;
    for (let i = 1; i < eqs.length; i++) {
      const e = eqs[i];
      if (mod(e.known + e.cSemi * vs + e.cDash * vd + K) !== e.c) { ok = false; break; }
    }
    if (ok) hits.push({ vs, vd, K });
  }
}
console.log(`solutions: ${hits.length}`);
for (const h of hits.slice(0, 20)) console.log(JSON.stringify(h));
