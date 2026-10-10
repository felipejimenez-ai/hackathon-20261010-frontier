import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"))
  .filter((d) => d.prefix !== "PING" && d.passing.length === 1)
  .map((d) => ({ s: d.prefix, c: Number(d.passing[0].control) }));

const mod = (a, n) => ((a % n) + n) % n;
const codes = (s) => [...s].map((ch) => ch.charCodeAt(0));
const digitsOf = (s) => [...s].filter((c) => /\d/.test(c)).map(Number);
const alnumVal = (s) => [...s].reduce((a, ch) => {
  const c = ch.charCodeAt(0);
  if (c >= 48 && c <= 57) return a + (c - 48);
  if (c >= 65 && c <= 90) return a + (c - 64);
  if (c >= 97 && c <= 122) return a + (c - 96);
  return a + c;
}, 0);

const candidates = {
  sumSq: (s) => mod(codes(s).reduce((a, b) => a + b * b, 0), 100),
  sumSqIdx: (s) => mod(codes(s).reduce((a, b, i) => a + b * b * (i + 1), 0), 100),
  weightedIdx0: (s) => mod(codes(s).reduce((a, b, i) => a + b * i, 0), 100),
  weightedRev0: (s) => mod(codes(s).reduce((a, b, i) => a + b * (codes(s).length - 1 - i), 0), 100),
  altSign: (s) => mod(codes(s).reduce((a, b, i) => a + (i % 2 ? -b : b), 0), 100),
  mod10sum: (s) => mod(codes(s).reduce((a, b) => a + (b % 10), 0), 100),
  codeMinus48: (s) => mod(codes(s).reduce((a, b) => a + (b - 48), 0), 100),
  codeMinus96: (s) => mod(codes(s).reduce((a, b) => a + (b - 96), 0), 100),
  codeMinus64: (s) => mod(codes(s).reduce((a, b) => a + (b - 64), 0), 100),
  nDigits: (s) => mod(digitsOf(s).reduce((a, b) => a + b, 0), 100),
  nDigitsIdx: (s) => mod(digitsOf(s).reduce((a, b, i) => a + b * (i + 1), 0), 100),
  alnumVal: (s) => mod(alnumVal(s), 100),
  lenSquared: (s) => mod(codes(s).length ** 2, 100),
  sumTimesLen: (s) => mod(codes(s).reduce((a, b) => a + b, 0) * codes(s).length, 100),
  sumTimes3: (s) => mod(codes(s).reduce((a, b) => a + b, 0) * 3, 100),
  xorAll: (s) => mod(codes(s).reduce((a, b) => a ^ b, 0), 100),
  xorAllIdx: (s) => mod(codes(s).reduce((a, b, i) => a ^ (b * (i + 1)), 0), 100),
  sumXorLen: (s) => mod(codes(s).reduce((a, b) => a + b, 0) ^ codes(s).length, 100),
};

const cryptoHashes = {};
for (const alg of ["md5", "sha1", "sha256"]) {
  cryptoHashes[`${alg}-hex2`] = (s) => parseInt(createHash(alg).update(s).digest("hex").slice(0, 2), 16) % 100;
  cryptoHashes[`${alg}-hexLast`] = (s) => parseInt(createHash(alg).update(s).digest("hex").slice(-2), 16) % 100;
  cryptoHashes[`${alg}-byteSum`] = (s) => mod([...createHash(alg).update(s).digest()].reduce((a, b) => a + b, 0), 100);
}

function crc(s, poly, init, xorout) {
  let c = init;
  for (const b of codes(s)) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = c & 0x80 ? ((c << 1) ^ poly) & 0xff : (c << 1) & 0xff;
  }
  return (c ^ xorout) & 0xff;
}

const all = { ...candidates, ...cryptoHashes };
const results = [];
for (const [name, fn] of Object.entries(all)) {
  let hits = 0;
  const miss = [];
  for (const { s, c } of data) {
    let v = NaN;
    try { v = fn(s); } catch {}
    if (v === c) hits++; else if (miss.length < 3) miss.push(`${s}:exp${c}got${v}`);
  }
  results.push({ name, hits, miss });
}

for (const poly of [0x07, 0x1d, 0x31, 0x9b, 0xd5, 0x4d, 0xa7]) {
  for (const init of [0x00, 0xff]) {
    for (const xorout of [0x00, 0xff]) {
      let hits = 0;
      for (const { s, c } of data) if (crc(s, poly, init, xorout) % 100 === c) hits++;
      results.push({ name: `crc8 poly=${poly.toString(16)} init=${init} xor=${xorout}`, hits, miss: [] });
    }
  }
}

results.sort((a, b) => b.hits - a.hits);
console.log(`data points: ${data.length}`);
for (const r of results.slice(0, 20)) {
  console.log(`${String(r.hits).padStart(2)}/${data.length}  ${r.name}${r.miss.length && r.hits > 0 ? "  " + r.miss[0] : ""}`);
}
