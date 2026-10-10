import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"))
  .filter((d) => d.prefix !== "PING" && d.passing.length === 1)
  .map((d) => ({ s: d.prefix, c: Number(d.passing[0].control) }));
const codes = (s) => [...s].map((ch) => ch.charCodeAt(0));
const M32 = (h) => h >>> 0;

function searchHashes() {
  const found = [];
  const ks = Array.from({ length: 256 }, (_, i) => i);
  const Modes = [
    { name: "wrap32", reduce: (h) => h >>> 0 },
    { name: "mod65536", reduce: (h) => h % 65536 },
    { name: "mod100", reduce: (h) => h % 100 },
  ];
  const ops = {
    mulAdd: (h, k, c) => h * k + c,
    mulXor: (h, k, c) => (h * k) ^ c,
    addMul: (h, k, c) => (h + c) * k,
    xorAdd: (h, k, c) => (h ^ c) * k,
  };
  for (const M of Modes) {
    for (const [opName, op] of Object.entries(ops)) {
      for (const fwd of [true, false]) {
        for (const k of ks) {
          for (const init of ks) {
            const hs = data.map(({ s }) => {
              let h = init;
              const a = codes(s);
              const seq = fwd ? a : a.slice().reverse();
              for (const c of seq) h = M.reduce(op(h, k, c));
              return M.reduce(h) % 100;
            });
            const offset = (((data[0].c - hs[0]) % 100) + 100) % 100;
            let hits = 0;
            for (let i = 0; i < data.length; i++) if ((hs[i] + offset) % 100 === data[i].c) hits++;
            if (hits >= data.length - 1) {
              found.push({ M: M.name, op: opName, fwd, k, init, offset, hits });
            }
          }
        }
      }
    }
  }
  found.sort((a, b) => b.hits - a.hits);
  return found;
}

const res = searchHashes();
console.log(`data points: ${data.length}`);
console.log(`candidates matching all: ${res.filter((r) => r.hits === data.length).length}`);
for (const r of res.slice(0, 30)) console.log(JSON.stringify(r));
