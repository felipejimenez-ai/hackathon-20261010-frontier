import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"))
  .filter((d) => d.prefix !== "PING" && d.passing.length === 1)
  .map((d) => ({ s: d.prefix, c: Number(d.passing[0].control) }));

const mod = (a, n) => ((a % n) + n) % n;
const codes = (s) => [...s].map((ch) => ch.charCodeAt(0));

function test(name, fn) {
  let hits = 0;
  for (const { s, c } of data) {
    let v;
    try { v = fn(s); } catch { v = NaN; }
    if (v === c) hits++;
  }
  return { name, hits };
}

const results = [];
const Ms = [100, 101, 97, 128, 256, 1000, 10000, 65536];

for (const M of Ms) {
  for (let k = 0; k <= 127; k++) {
    for (const init of [0, 5381, 1]) {
      results.push(test(`poly+ k=${k} init=${init} M=${M}`, (s) => {
        let h = init;
        for (const c of codes(s)) h = mod(h * k + c, M);
        return mod(h, 100);
      }));
      results.push(test(`polyRev k=${k} init=${init} M=${M}`, (s) => {
        let h = init;
        const a = codes(s);
        for (let i = a.length - 1; i >= 0; i--) h = mod(h * k + a[i], M);
        return mod(h, 100);
      }));
      results.push(test(`polyxor k=${k} init=${init} M=${M}`, (s) => {
        let h = init;
        for (const c of codes(s)) h = mod((h * k) ^ c, M);
        return mod(h, 100);
      }));
    }
  }
}

for (const M of Ms) {
  for (let a = 1; a <= 127; a++) {
    results.push(test(`affineSum a=${a} M=${M}`, (s) => {
      const S = codes(s).reduce((x, y) => x + y, 0);
      return mod(a * S, M) % 100;
    }));
  }
}

results.sort((x, y) => y.hits - x.hits);
for (const r of results.slice(0, 25)) console.log(`${String(r.hits).padStart(2)}/${data.length}  ${r.name}`);
console.log(`\ndata points: ${data.length}`);
