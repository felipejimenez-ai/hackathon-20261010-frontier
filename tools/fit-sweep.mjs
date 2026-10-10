import fs from "node:fs";

const valid = JSON.parse(fs.readFileSync("tools/valid-pairs.json", "utf8")); // [[body, control], ...]
const sweep = JSON.parse(fs.readFileSync("tools/sweep-pairs.json", "utf8")); // { body: control }

const M = 97;
const mod = (x) => ((x % M) + M) % M;
const inv = (a) => { for (let x = 1; x < M; x++) if ((a * x) % M === 1) return x; return null; };
const p10 = (n) => { let r = 1; for (let i = 0; i < n; i++) r = mod(r * 10); return r; };

const SEP = new Set([";", "-"]);
const norm = (b) => { const i = b.indexOf(";"); return (i === -1 ? b.toUpperCase() : b.slice(0, i).toUpperCase() + b.slice(i)); };

const pairs = [
  ...valid.map(([b, c]) => [norm(b), c]),
  ...Object.entries(sweep).map(([b, c]) => [norm(b), c]),
].filter(([, c]) => c !== null);

const chars = [...new Set(pairs.flatMap(([b]) => [...b]))].sort();
const idx = new Map(chars.map((c, i) => [c, i]));
const n = chars.length + 1; // + K constant column

// r = ((98 - c) % 97)
const rows = pairs.map(([b, c]) => {
  const r = new Array(n + 1).fill(0);
  let after = 0;
  const coef = new Array(b.length);
  for (let i = b.length - 1; i >= 0; i--) { coef[i] = p10(after); if (!SEP.has(b[i])) after++; }
  for (let i = 0; i < b.length; i++) { const col = idx.get(b[i]); r[col] = mod(r[col] + coef[i]); }
  r[n - 1] = 1;              // K column
  r[n] = mod(98 - c);        // = r modulo 97
  return r;
});

let basis = [];
const incons = [];
for (const [pi, row] of rows.entries()) {
  let r = row.slice();
  for (const [col, brow] of basis) if (r[col]) { const f = r[col]; r = r.map((x, j) => mod(x - f * brow[j])); }
  const col = r.slice(0, n).findIndex((x) => x);
  if (col < 0) { if (r[n]) incons.push(pairs[pi][0]); continue; }
  const iv = inv(r[col]); r = r.map((x) => mod(x * iv));
  for (const bw of basis) if (bw[1][col]) { const f = bw[1][col]; for (let j = 0; j <= n; j++) bw[1][j] = mod(bw[1][j] - f * r[j]); }
  basis.push([col, r]);
}
console.log("eqs", pairs.length, "chars", chars.length, "rank", basis.length, "inconsistent", incons.length);
if (incons.length) console.log("inconsistent bodies:", incons.slice(0, 20));

const sol = {};
for (const [col, row] of basis) {
  const free = row.slice(0, n).some((x, j) => j !== col && x);
  sol[col < n - 1 ? chars[col] : "K"] = free ? "?" : row[n];
}
console.log(JSON.stringify(sol));
