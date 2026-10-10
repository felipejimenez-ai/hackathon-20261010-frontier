import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"))
  .filter((d) => d.prefix !== "PING" && d.passing.length === 1 && !d.prefix.endsWith(";"))
  .map((d) => ({ s: d.prefix, c: Number(d.passing[0].control) }));

const nib = (s) => [...s].map((ch) => ch.charCodeAt(0) & 0xf);
const Modes = {
  wrap32: (h) => h >>> 0,
  mod65536: (h) => h % 65536,
  mod100: (h) => h % 100,
  mod256: (h) => h % 256,
  mod1000: (h) => h % 1000,
  mod97: (h) => h % 97,
  mod99: (h) => h % 99,
  mod101: (h) => h % 101,
  mod103: (h) => h % 103,
};
const ops = {
  mulAdd: (h, k, c) => h * k + c,
  addMul: (h, k, c) => (h + c) * k,
  mulXor: (h, k, c) => (h * k) ^ c,
};

const found = [];
for (const [mn, reduce] of Object.entries(Modes)) {
  for (const [on, op] of Object.entries(ops)) {
    for (const fwd of [true, false]) {
      for (let k = 0; k <= 255; k++) {
        for (let init = 0; init <= 255; init++) {
          const hs = data.map(({ s }) => {
            let h = init;
            const a = nib(s);
            const seq = fwd ? a : a.slice().reverse();
            for (const c of seq) h = reduce(op(h, k, c));
            return reduce(h);
          });
          for (const finalMod of [true, false]) {
            const vals = hs.map((h) => (finalMod ? ((h % 100) + 100) % 100 : h));
            const offset = (((data[0].c - vals[0]) % 100) + 100) % 100;
            let hits = 0;
            for (let i = 0; i < data.length; i++) if ((vals[i] + offset) % 100 === data[i].c) hits++;
            if (hits >= data.length - 1) found.push({ M: mn, op: on, fwd, k, init, finalMod, offset, hits });
          }
        }
      }
    }
  }
}
found.sort((a, b) => b.hits - a.hits);
console.log(`points: ${data.length}`);
for (const f of found.slice(0, 20)) console.log(JSON.stringify(f));
if (!found.length) console.log("no candidates");
