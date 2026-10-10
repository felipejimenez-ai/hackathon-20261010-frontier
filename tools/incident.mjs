import fs from "node:fs";

// Differential probe harness for the v2 incident (ticket FR-0153).
// Usage: node tools/incident.mjs samples | battery
// Token: CAJA_NEGRA_TOKEN_2 (never printed or logged). Hard cap on calls, throttled, stops on 429.
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/))
    .filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")])
);
const URL_ = env.CAJA_NEGRA_URL.replace(/\/$/, "");
const TOKEN = env.CAJA_NEGRA_TOKEN_2;
if (!TOKEN) throw new Error("CAJA_NEGRA_TOKEN_2 missing");
const H = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };

const CAP = 1500;
const COUNTER_FILE = "tools/.incident-calls";
let calls = fs.existsSync(COUNTER_FILE) ? Number(fs.readFileSync(COUNTER_FILE, "utf8")) || 0 : 0;
let lastTs = 0;
const MIN_GAP = 125; // ~8 req/s

async function http(path, init) {
  if (calls >= CAP) throw new Error(`call cap ${CAP} reached`);
  const wait = lastTs + MIN_GAP - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastTs = Date.now();
  calls += 1;
  fs.writeFileSync(COUNTER_FILE, String(calls));
  const r = await fetch(URL_ + path, init);
  const text = await r.text();
  if (r.status === 429) throw new Error("429 rate-limit: stopping");
  return { status: r.status, text };
}

let logId = 10000;
for (const l of fs.readFileSync("experimentos.jsonl", "utf8").split("\n").slice(-200)) {
  try { const o = JSON.parse(l); if (o.id >= logId) logId = o.id + 1; } catch {}
}
function log(seq, i, hipotesis, request, res, conclusion) {
  let response; try { response = JSON.parse(res.text); } catch { response = res.text; }
  fs.appendFileSync("experimentos.jsonl", "\n" + JSON.stringify({
    id: logId++, seq, x_req: String(i), hipotesis, request, status: res.status, response, conclusion,
  }));
}

export const reset = () => http("/__reset", { method: "POST", headers: H });
export const msg = (m) => http("/msg", { method: "POST", headers: H, body: JSON.stringify({ m }) });

const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}

const SAMPLES = JSON.parse("[" + fs.readFileSync("docs-hackathon/challenge/frontier-reto-2/pruebas/ejemplos.jsonl", "utf8")
  .trim().split(/\r?\n/).filter(Boolean).join(",") + "]");

async function samples() {
  const rs = await reset();
  console.log("reset ->", rs.status, rs.text);
  const diffs = [];
  for (const [i, s] of SAMPLES.entries()) {
    const got = await msg(s.request.m);
    let body; try { body = JSON.parse(got.text); } catch { body = got.text; }
    const ok = got.status === s.status && same(body, s.response);
    if (!ok) diffs.push(s.n);
    console.log(`n=${s.n} ${ok ? "ok  " : "DIFF"} ${s.request.m} -> ${got.status} ${got.text}` +
      (ok ? "" : `   (v1: ${s.status} ${JSON.stringify(s.response)})`));
    log("incidente:muestras", i, `v1 vs v2 en ejemplo n=${s.n}`, { m: s.request.m }, got,
      ok ? "igual a v1" : `CAMBIO: v1=${s.status} ${JSON.stringify(s.response)} v2=${got.status} ${got.text}`);
  }
  console.log(`\ncalls used so far: ${calls}/${CAP}; diffs at n = [${diffs.join(", ")}]`);
}

const cmd = process.argv[2];
if (cmd === "samples") await samples();

// ---- controls for digit-only variations of a known body (validated model: base-10 Horner mod 97) ----
const M97 = 97;
const mod97 = (x) => ((x % M97) + M97) % M97;
const inv97 = (a) => { for (let x = 1; x < M97; x++) if (a * x % M97 === 1) return x; };
const pow10 = (n) => { let r = 1; for (let i = 0; i < n; i++) r = mod97(r * 10); return r; };
const horner = (s) => { let h = 0; for (const ch of s) h = mod97(h * 10 + Number(ch)); return h; };
const norm97 = (x) => { x = mod97(x); return x < 2 ? x + 97 : x; };
// Given a known (body, control) whose body ends in a digit string, return fn(amount)->control for the same prefix.
function ctrlFamily(knownBody, knownControl) {
  const m = knownBody.match(/^(.*?)(\d+)$/);
  const amt = m[2];
  const h = mod97((1 - knownControl) * inv97(3));
  const P = mod97((h - horner(amt)) * inv97(pow10(amt.length)));
  return (a) => norm97(1 - 3 * mod97(P * pow10(String(a).length) + horner(String(a))));
}
const ctrlTransfer = ctrlFamily("TRANSFER;AC-0001;AC-0002;40000", 86);
const ctrlDeposit = ctrlFamily("DEPOSITO;AC-0001;250000", 86);

async function setup(deposit = 250000) {
  await reset();
  await msg("ALTA;Lucia;82");
  await msg("ALTA;Mateo;3");
  const d = await msg(`DEPOSITO;AC-0001;${deposit};${ctrlDeposit(deposit)}`);
  return d;
}
async function tryTransfer(amount, i) {
  await setup();
  const m = `TRANSFER;AC-0001;AC-0002;${amount};${ctrlTransfer(amount)}`;
  const r = await msg(m);
  const over = r.status === 422 && r.text.includes("E506");
  log("incidente:limite", i, `limite de transferencia v2: monto ${amount}`, { m }, r,
    over ? `${amount} -> E506 (sobre el limite)` : `${amount} -> ${r.status} (dentro del limite)`);
  console.log(`amount ${amount} -> ${r.status} ${r.text}`);
  return over;
}
async function limit() {
  let lo = 40000, hi = 100000, i = 0; // lo known ok, hi known E506
  while (hi - lo > 1) {
    const mid = Math.floor((lo + hi) / 2);
    (await tryTransfer(mid, i++)) ? (hi = mid) : (lo = mid);
  }
  console.log(`\nLIMIT: max accepted = ${lo}, first rejected = ${hi}; calls ${calls}/${CAP}`);
  // confirm with larger balance (limit should not depend on balance)
  await reset(); await msg("ALTA;Lucia;82"); await msg("ALTA;Mateo;3");
  const d = await msg(`DEPOSITO;AC-0001;900000;${ctrlDeposit(900000)}`);
  console.log("deposit 900000 ->", d.status, d.text);
  for (const a of [lo, hi]) {
    const m = `TRANSFER;AC-0001;AC-0002;${a};${ctrlTransfer(a)}`;
    const r = await msg(m);
    log("incidente:limite", i++, `limite no depende del saldo: monto ${a} con saldo mayor`, { m }, r, `${a} -> ${r.status}`);
    console.log(`bigger balance, amount ${a} -> ${r.status} ${r.text}`);
  }
}
if (cmd === "limit") await limit();

const ctrlAnula = ctrlFamily("ANULA;OP-0003", 66);
const ctrlConsulta = (n) => modelControlAC(n);
import { modelControl } from "../src/checksum.mjs";
function modelControlAC(n) { return modelControl(`CONSULTA;AC-${String(n).padStart(4, "0")}`); }

let bi = 0;
async function step(seq, hip, m) {
  const r = await msg(m);
  log(seq, bi++, hip, { m }, r, `${r.status} ${r.text}`);
  console.log(`${m} -> ${r.status} ${r.text}`);
  return r;
}
const cons = (n) => step("incidente:anula", "estado tras operacion", `CONSULTA;AC-${String(n).padStart(4, "0")};${ctrlConsulta(n)}`);
const anul = (n) => step("incidente:anula", "ANULA v2", `ANULA;OP-${String(n).padStart(4, "0")};${ctrlAnula(String(n).padStart(4, "0"))}`);

async function anula() {
  await reset();
  await step("incidente:anula", "setup", "ALTA;Lucia;82");
  await step("incidente:anula", "setup", "ALTA;Mateo;3");
  await step("incidente:anula", "deposito OP-0001", `DEPOSITO;AC-0001;250000;${ctrlDeposit(250000)}`);
  await step("incidente:anula", "transfer OP-0002", `TRANSFER;AC-0001;AC-0002;40000;${ctrlTransfer(40000)}`);
  await cons(1); await cons(2);
  await anul(2);          // annul the transfer
  await cons(1); await cons(2);
  await anul(2);          // double annul
  await anul(1);          // annul the deposit
  await cons(1);
  await anul(9);          // missing op
  console.log(`\ncalls ${calls}/${CAP}`);
}
if (cmd === "anula") await anula();

// control for a body of the SAME length as a known body, differing only in digits/letters (validated g values)
function gv(ch) {
  ch = ch.toUpperCase();
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") { const x = (ch.charCodeAt(0) - 64) % 17; return x > 9 ? x - 17 : x; }
  throw new Error("unknown char value: " + ch);
}
function ctrlFrom(knownBody, knownControl, body) {
  if (knownBody.length !== body.length) throw new Error("length differs");
  let dh = 0;
  for (let i = 0; i < body.length; i++) {
    if (knownBody[i] === body[i]) continue;
    dh += (gv(body[i]) - gv(knownBody[i])) * pow10(body.length - 1 - i);
  }
  return norm97(knownControl - 3 * mod97(dh));
}
const withCtrl = (knownBody, knownControl, body) => `${body};${ctrlFrom(knownBody, knownControl, body)}`;

async function explore() {
  const S = "incidente:explorar";
  const go = async (hip, m) => { const r = await msg(m); log(S, bi++, hip, { m }, r, `${r.status} ${r.text}`); console.log(`${hip}\n   ${m} -> ${r.status} ${r.text}`); return r; };
  await reset();
  await go("alta", "ALTA;Lucia;82");
  await go("alta duplicada (mismo nombre)", "ALTA;Lucia;82");
  await go("alta", "ALTA;Mateo;3");
  await go("consulta id en minuscula", withCtrl("CONSULTA;AC-0001", 14, "CONSULTA;AC-0001").replace("AC-0001", "ac-0001"));
  await go("deposito monto 0", `DEPOSITO;AC-0001;0;${ctrlDeposit(0)}`);
  await go("deposito ceros a la izquierda", `DEPOSITO;AC-0001;000700;${ctrlDeposit("000700")}`);
  await go("deposito enorme", `DEPOSITO;AC-0001;99999999999;${ctrlDeposit("99999999999")}`);
  await go("consulta tras enorme", `CONSULTA;AC-0001;14`);
  await go("deposito cuenta inexistente AC-0003", `${"DEPOSITO;AC-0003;700"};${ctrlFrom("DEPOSITO;AC-0001;700", 28, "DEPOSITO;AC-0003;700")}`);
  await go("transfer a si mismo", withCtrl("TRANSFER;AC-0001;AC-0002;40000", 86, "TRANSFER;AC-0001;AC-0001;40000"));
  await go("transfer destino inexistente", withCtrl("TRANSFER;AC-0001;AC-0002;40000", 86, "TRANSFER;AC-0001;AC-0003;40000"));
  await go("transfer monto 0", `TRANSFER;AC-0001;AC-0002;0;${ctrlTransfer(0)}`);
  await go("transfer origen sin fondos", withCtrl("TRANSFER;AC-0001;AC-0002;40000", 86, "TRANSFER;AC-0002;AC-0001;40000"));
  await go("E104 segmento vacio", "CONSULTA;;0");
  await go("PING sin control", "PING");
  await go("comando desconocido, control invalido", "SALDOS;AC-0001;99");
  await go("aridad invalida, control invalido", "ALTA;Lucia;Gomez;99");
  await go("sin control en comando real", "CONSULTA;AC-0001");
  console.log(`\ncalls ${calls}/${CAP}`);
}
if (cmd === "explore") await explore();
