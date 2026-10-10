import fs from "node:fs";
const sweep = JSON.parse(fs.readFileSync("tools/sweep-pairs.json", "utf8"));
const fresh = [["CONSULTA;AA",95],["CONSULTA;AB",92],["CONSULTA;BA",65],["CONSULTA;JJ",68],["CONSULTA;SS",57],["CONSULTA;A;A",95],["XONSULTA;A",57],["CONSULTB;A",68],["CONSULTAA;A",95],["AAA;AAA",57],["BAA;AAA",78],["ABA;AAA",30],["AAB;AAA",64],["AAABAAA",80],["AAA;BAA",48],["AAA;ABA",27],["AAA;AAB",54],["AAA-AAA",57],["CONSULTA;J",98],["CONSULTA;JJJ",75],["CONSULTA;JJJJ",96],["CONSULTA;S",71],["CONSULTA;SSS",15],["CONSULTA;AJ",68],["CONSULTA;JA",95],["CONSULTA;AJA",86],["CONSULTA;AAJ",59],["CONSULTA;JAA",65]];
const norm = (b) => { const i = b.indexOf(";"); return i === -1 ? b.toUpperCase() : b.slice(0, i).toUpperCase() + b.slice(i); };
const P = [...Object.entries(sweep).map(([b, c]) => [norm(b), c]), ...fresh.map(([b, c]) => [norm(b), c])].filter(([, c]) => c !== null);

const M = 97, mod = (x) => ((x % M) + M) % M;
const codes = {
  ascii: (ch) => ch.charCodeAt(0),
  asciiUpper: (ch) => ch.toUpperCase().charCodeAt(0),
  digitL: (ch) => (ch >= "0" && ch <= "9" ? ch.charCodeAt(0) - 48 : ch.charCodeAt(0)),
};
function hfold(body, code, base) { let h = 0; for (const ch of body) h = (h * base + code(ch)) % M; return h; }

// control = norm(k - m*h) => find k,m in range that matching all pairs
function normC(x) { x = mod(x); if (x === 0) return 98; if (x === 1) return 97; return x; }
let found = [];
for (const [cname, code] of Object.entries(codes)) {
  for (const base of [10, 100]) {
    const hs = P.map(([b]) => hfold(b, code, base));
    for (let m = 0; m < M; m++) {
      for (let k = 0; k < M; k++) {
        if (P.every(([, c], i) => normC(k - m * hs[i]) === c)) found.push({ cname, base, m, k });
      }
    }
  }
}
console.log("exact matches:", found.length, found.slice(0, 5));

// Also try control = norm(k - m*h) but with h = sum(code*base^after) i.e. same as fold; done.
// Report how clos
