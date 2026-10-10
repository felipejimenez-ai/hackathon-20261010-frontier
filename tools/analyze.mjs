import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"))
  .filter((d) => d.prefix !== "PING" && d.passing.length === 1)
  .map((d) => ({ s: d.prefix, c: Number(d.passing[0].control) }));

const mod = (a, n) => ((a % n) + n) % n;
const codes = (s) => [...s].map((ch) => ch.charCodeAt(0));

const candidates = {
  sumMod100: (s) => mod(codes(s).reduce((a, b) => a + b, 0), 100),
  sumMod97: (s) => mod(codes(s).reduce((a, b) => a + b, 0), 97),
  weightedSum: (s) => mod(codes(s).reduce((a, b, i) => a + b * (i + 1), 0), 100),
  weightedSumRev: (s) => mod(codes(s).reduce((a, b, i) => a + b * (codes(s).length - i), 0), 100),
  xorMod100: (s) => mod(codes(s).reduce((a, b) => a ^ b, 0), 100),
  productMod100: (s) => mod(codes(s).reduce((a, b) => a * b, 1), 100),
  digitSum: (s) => mod([...s].filter((c) => /\d/.test(c)).reduce((a, c) => a + Number(c), 0), 100),
  digitSumAll: (s) => mod(codes(s).join("").split("").reduce((a, c) => a + Number(c || 0), 0), 100),

  djb2: (s) => { let h = 5381; for (const c of codes(s)) h = (h * 33 + c) >>> 0; return h % 100; },
  djb2xor: (s) => { let h = 5381; for (const c of codes(s)) h = ((h * 33) ^ c) >>> 0; return h % 100; },
  sdbm: (s) => { let h = 0; for (const c of codes(s)) h = (c + (h << 6) + (h << 16) - h) >>> 0; return h % 100; },
  java: (s) => { let h = 0; for (const c of codes(s)) h = (h * 31 + c) | 0; return mod(h, 100); },
  fnv1a: (s) => { let h = 2166136261; for (const c of codes(s)) { h ^= c; h = Math.imul(h, 16777619); } return (h >>> 0) % 100; },
  fnv1: (s) => { let h = 2166136261; for (const c of codes(s)) { h = Math.imul(h, 16777619); h ^= c; } return (h >>> 0) % 100; },

  luhn: (s) => {
    const digits = codes(s).join("").split("").map(Number).filter((n) => !isNaN(n));
    let sum = 0, dbl = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits[i];
      if (dbl) { d *= 2; if (d > 9) d -= 9; }
      sum += d; dbl = !dbl;
    }
    return mod(sum, 100);
  },

  crc8_07: (s) => crc8(s, 0x07),
  crc8_1d: (s) => crc8(s, 0x1d),
  crc8_31: (s) => crc8(s, 0x31),
  crc8_9b: (s) => crc8(s, 0x9b),
  crc8_d5: (s) => crc8(s, 0xd5),
  crc8_j1850: (s) => crc8(s, 0x1d, 0xff, 0xff),
};

function crc8(s, poly, init = 0x00, xorout = 0x00) {
  let crc = init;
  for (const c of codes(s)) {
    crc ^= c;
    for (let i = 0; i < 8; i++) crc = crc & 0x80 ? ((crc << 1) ^ poly) & 0xff : (crc << 1) & 0xff;
  }
  return (crc ^ xorout) % 100;
}

let best = [];
for (const [name, fn] of Object.entries(candidates)) {
  let hits = 0;
  const misses = [];
  for (const { s, c } of data) {
    let v;
    try { v = fn(s); } catch { v = NaN; }
    if (v === c) hits++; else misses.push(`${s} exp=${c} got=${v}`);
  }
  best.push({ name, hits, total: data.length, misses });
}
best.sort((a, b) => b.hits - a.hits);
for (const b of best) {
  console.log(`${String(b.hits).padStart(2)}/${b.total}  ${b.name}`);
  if (b.hits > 0 && b.hits < b.total) b.misses.slice(0, 4).forEach((m) => console.log(`      ${m}`));
}
console.log(`\ndata points: ${data.length}`);
