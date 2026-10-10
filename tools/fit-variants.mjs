import fs from "node:fs";
const valid = JSON.parse(fs.readFileSync("tools/valid-pairs.json", "utf8"));
const sweep = JSON.parse(fs.readFileSync("tools/sweep-pairs.json", "utf8"));
const M = 97, mod = (x) => ((x % M) + M) % M;
const inv = (a) => { for (let x = 1; x < M; x++) if ((a * x) % M === 1) return x; return null; };
const norm = (b) => { const i = b.indexOf(";"); return i === -1 ? b.toUpperCase() : b.slice(0, i).toUpperCase() + b.slice(i); };
const base = [...valid.map(([b, c]) => [norm(b), c]), ...Object.entries(sweep).map(([b, c]) => [norm(b), c])].filter(([, c]) => c !== null);

function fit(pairs, { sepCounts, sepValueUnknown }) {
  // sepCounts: do separators increment the positional counter?
  // weights = base^after where after is counted per sepCounts.
  const chars = [...new Set(pairs.flatMap(([b]) => [...b]))].sort();
  const idx = new Map(chars.map((c, i) => [c, i]));
  const n = chars.length + 1;
  const rows = pairs.map(([b, c]) => {
    const row = new Array(n + 1).fill(0);
    let after = 0; const coef = new Array(b.length);
    for (let i = b.length - 1; i >= 0; i--) {
      const isSep = b[i] === ";" || b[i] === "-";
      const counts = !isSep || sepCounts;
      coef[i] = Math.pow(10 % M, after) % M; // weight
      if (counts) after++;
    }
    for (let i = 0; i < b.length; i++) {
      const isSep = b[i] === ";" || b[i] === "-";
      if (isSep && !sepValueUnknown) continue; // sep contributes nothing
      const col = idx.get(b[i]);
      row[col] = mod(row[col] + coef[i]);
    }
    row[n - 1] = 1;
    row[n] = c; // target = control directly
    return row;
  });
  let basis = []; const incons = [];
  for (const [pi, row] of rows.entries()) {
    let r = row.slice();
    for (const [col, br] of basis) if (r[col]) { const f = r[col]; r = r.map((x, j) => mod(x - f * br[j])); }
    const col = r.slice(0, n).findIndex((x) => x);
    if (col < 0) { if (r[n]) incons.push(pairs[pi][0]); continue; }
    const iv = inv(r[col]);
    if (iv === null) { incons.push(pairs[pi][0]); continue; }
    r = r.map((x) => mod(x * iv));
    for (const br of basis) if (br[1][col]) { const f = br[1][col]; for (let j = 0; j <= n; j++) br[1][j] = mod(br[1][j] - f * r[j]); }
    basis.push([col, r]);
  }
  return { rank: basis.length, unknowns: n, incons };
}

for (const sepCounts of [false, true]) {
  for (const sepValueUnknown of [true, false]) {
    const r = fit(base, { sepCounts, sepValueUnknown });
    console.log(`sepCounts=${sepCounts} sepValue=${sepValueUnknown} rank=${r.rank}/${r.unknowns} incons=${r.incons.length}`, r.incons.slice(0, 6));
  }
}
