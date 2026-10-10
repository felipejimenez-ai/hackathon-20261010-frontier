import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { reset, probe } from "./recon.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "char-values.json");
const mod = (a) => ((a % 100) + 100) % 100;

const BASE = "CONSULTA;AAAAA"; // + char, control base 36, w1 = -3
const BASE_CTRL = 36;
const W1 = 97; // -3

function ruleV(c) {
  const code = c.charCodeAt(0);
  let idx;
  if (code >= 48 && code <= 57) idx = code - 49;
  else if (code >= 65 && code <= 90) idx = code - 65;
  else if (code >= 97 && code <= 122) idx = code - 65; // map lowercase to uppercase
  else return 0;
  let val = ((idx % 17) + 17) % 17;
  if (val > 8) val -= 17;
  return val;
}

async function smartCrack(str, predicted) {
  const seq = `sv:${str}`;
  await reset(seq);
  const cands = [];
  for (let off = 0; off <= 24; off += 3) {
    cands.push(mod(predicted + off));
    if (off) cands.push(mod(predicted - off));
  }
  for (let n = 0; n <= 99; n++) cands.push(n);
  for (const n of cands) {
    if (BUDGET.used >= BUDGET.max) throw new Error("budget exceeded");
    BUDGET.used++;
    const r = await probe({ seq, hipotesis: "value probe", m: `${str};${n}` });
    if (!(r.json && r.json.error === "E202")) return n;
  }
  return null;
}

const BUDGET = { used: 0, max: 110 };

const chars = ["I", "J", "K", "L", "u", "c", "i", "a", "e", "o", "m", "t", "l", "z", "0", "-"];
const out = existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : {};

for (const ch of chars) {
  if (out[ch] !== undefined) continue;
  const msg = BASE + ch;
  const predicted = mod(BASE_CTRL + ruleV(ch) * (-3));
  const ctrl = await smartCrack(msg, predicted);
  const v = ctrl === null ? null : mod((BASE_CTRL - ctrl) * 33); // (36-ctrl)/-3
  out[ch] = { control: ctrl, v, predicted };
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`${ch}: control=${ctrl} v=${v} (ruleV=${ruleV(ch)}, pred=${predicted})`);
}
