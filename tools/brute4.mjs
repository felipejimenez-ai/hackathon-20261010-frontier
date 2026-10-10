import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const data = JSON.parse(readFileSync(resolve(__dirname, "control-dataset.json"), "utf8"))
  .filter((d) => d.prefix !== "PING" && d.passing.length === 1 && !d.prefix.endsWith(";"))
  .map((d) => ({ s: d.prefix, c: Number(d.passing[0].control) }));

const mod = (a, n) => ((a % n) + n) % n;
const bytes = (s) => [...s].map((ch) => ch.charCodeAt(0));

function crc(s, poly, init, xorout, width = 8) {
  let c = init;
  const mask = width === 8 ? 0xff : 0xffff;
  const top = width === 8 ? 0x80 : 0x8000;
  for (const b of bytes(s)) {
    c ^= width === 8 ? b : b << 8;
    for (let i = 0; i < 8; i++) c = c & top ? ((c << 1) ^ poly) & mask : (c << 1) & mask;
  }
  return (c ^ xorout) & mask;
}

function fletcher16(s) {
  let a = 0, b = 0;
  for (const x of bytes(s)) { a = (a + x) % 255; b = (b + a) % 255; }
  return (b << 8) | a;
}
function adler32(s) {
  let a = 1, b = 0;
  for (const x of bytes(s)) { a = (a + x) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

const results = [];
function check(name, fn) {
  let hits = 0;
  for (const { s, c } of data) {
    let v = NaN;
    try { v = fn(s); } catch {}
    if (v === c) hits++;
  }
  results.push({ name, hits });
}

// CRC variants
for (let poly = 0; poly <= 255; poly++) {
  for (const init of [0, 0xff]) {
    for (const xo of [0, 0xff]) {
      check(`crc8 p=${poly} i=${init} x=${xo} %100`, (s) => crc(s, poly, init, xo, 8) % 100);
      check(`crc8 p=${poly} i=${init} x=${xo} ==c`, (s) => crc(s, poly, init, xo, 8));
    }
  }
}
for (let poly = 0; poly <= 0xffff; poly += 7) {
  check(`crc16 p=${poly} %100`, (s) => crc(s, poly, 0, 0, 16) % 100);
  check(`crc16 p=${poly} &0xff %100`, (s) => crc(s, poly, 0, 0, 16) & 0xff % 100);
}

check("fletcher16%100", (s) => fletcher16(s) % 100);
check("fletcher16&0xff", (s) => fletcher16(s) & 0xff);
check("fletcher16>>8", (s) => fletcher16(s) >> 8);
check("adler32%100", (s) => adler32(s) % 100);
check("adler32&0xff", (s) => adler32(s) & 0xff);

// common string hashes
const hashes = {
  java: (s) => { let h = 0; for (const c of bytes(s)) h = (Math.imul(h, 31) + c) | 0; return h; },
  djb2: (s) => { let h = 5381; for (const c of bytes(s)) h = (Math.imul(h, 33) + c) | 0; return h; },
  djb2xor: (s) => { let h = 5381; for (const c of bytes(s)) h = (Math.imul(h, 33) ^ c) | 0; return h; },
  sdbm: (s) => { let h = 0; for (const c of bytes(s)) h = (c + (h << 6) + (h << 16) - h) | 0; return h; },
  fnv1a32: (s) => { let h = 2166136261; for (const c of bytes(s)) { h ^= c; h = Math.imul(h, 16777619); } return h >>> 0; },
  fnv1_32: (s) => { let h = 2166136261; for (const c of bytes(s)) { h = Math.imul(h, 16777619); h ^= c; } return h >>> 0; },
  jsHash: (s) => { let h = 0; for (const c of bytes(s)) h = (Math.imul(h, 31) + c) | 0; return h >>> 0; },
  pjw: (s) => { let h = 0; for (const c of bytes(s)) { h = (h << 4) + c; const g = h & 0xf0000000; if (g) h ^= g >>> 24; h &= ~g; } return h >>> 0; },
  elf: (s) => { let h = 0; for (const c of bytes(s)) { h = (h << 4) + c; const g = h & 0xf0000000; if (g) h ^= g >>> 24; h &= ~g; } return h >>> 0; },
};
for (const [name, fn] of Object.entries(hashes)) {
  for (const up of [false, true]) {
    const g = (s) => fn(up ? s.toUpperCase() : s);
    check(`${name}${up ? " UPPER" : ""} %100`, (s) => mod(g(s), 100));
    check(`${name}${up ? " UPPER" : ""} &0xff`, (s) => g(s) & 0xff);
    check(`${name}${up ? " UPPER" : ""} >>>8 &0xff`, (s) => (g(s) >>> 8) & 0xff);
    check(`${name}${up ? " UPPER" : ""} unsigned%100`, (s) => (g(s) >>> 0) % 100);
  }
}

results.sort((a, b) => b.hits - a.hits);
console.log(`points: ${data.length}`);
for (const r of results.slice(0, 15)) console.log(`${String(r.hits).padStart(3)}/${data.length}  ${r.name}`);
