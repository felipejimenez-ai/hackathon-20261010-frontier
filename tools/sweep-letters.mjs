import fs from "node:fs";
import { msg, reset, findControl, calls } from "./sweep-lib.mjs";

const args = process.argv.slice(2);
const mode = args[0] || "case";
const carrier = args[1] || "CONSULTA";

const CASE = ["A", "a", "B", "b", "Z", "z", "U", "u", "M", "m", "E", "e", "C", "c"];
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const LOWER = "abcdefghijklmnopqrstuvwxyz".split("");
const EXTRA = ["Ñ", "ñ", "Á", "É", "Í", "Ó", "Ú", "á", "é", "í", "ó", "ú", " ", "0", "9", "_", "."];

let list;
if (mode === "case") list = CASE;
else if (mode === "upper") list = UPPER;
else if (mode === "lower") list = LOWER;
else list = [...UPPER, ...LOWER, ...EXTRA];

const outPath = "tools/sweep-pairs.json";
const pairs = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, "utf8")) : {};
const seen = new Set(Object.keys(pairs));

console.log(`mode=${mode} carrier=${carrier} n=${list.length} startCalls=${calls}`);
for (const ch of list) {
  const body = `${carrier};${ch}`;
  if (seen.has(body)) { console.log(`skip ${JSON.stringify(body)} -> ${pairs[body]}`); continue; }
  const c = await findControl(body, `sweep-${mode}`, `valor de ${JSON.stringify(ch)} en ${carrier}`);
  pairs[body] = c;
  console.log(`"${ch}" (U+${ch.codePointAt(0).toString(16).toUpperCase()}) body=${JSON.stringify(body)} -> control=${c}`);
  fs.writeFileSync(outPath, JSON.stringify(pairs, null, 0));
}
console.log("calls", calls);
