import fs from "node:fs";

// Evidence probes for spec rows that had no log line (health/reset, leading-zero control,
// error precedence). Appends to experimentos.jsonl with seq "evidencia:*".
// Usage: node tools/evidence.mjs   (uses CAJA_NEGRA_TOKEN_2; never printed or logged)
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/))
    .filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")])
);
const URL_ = env.CAJA_NEGRA_URL.replace(/\/$/, "");
const TOKEN = env.CAJA_NEGRA_TOKEN_2;
if (!TOKEN) throw new Error("CAJA_NEGRA_TOKEN_2 missing");
const H = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };

let lastTs = 0;
let calls = 0;
const CAP = 900;
async function http(path, init) {
  if (calls >= CAP) throw new Error("cap reached");
  const wait = lastTs + 130 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastTs = Date.now();
  calls++;
  const r = await fetch(URL_ + path, init);
  const text = await r.text();
  if (r.status === 429) throw new Error("429 rate-limit: stopping");
  return { status: r.status, text };
}

let logId = 16000;
for (const l of fs.readFileSync("experimentos.jsonl", "utf8").split("\n")) {
  if (!l) continue;
  try { const o = JSON.parse(l); if (o.id >= logId) logId = o.id + 1; } catch {}
}
const firstId = logId;
function log(seq, i, hipotesis, request, res, conclusion) {
  let response; try { response = JSON.parse(res.text); } catch { response = res.text; }
  fs.appendFileSync("experimentos.jsonl", "\n" + JSON.stringify({
    id: logId++, seq, x_req: String(i), hipotesis, request, status: res.status, response, conclusion,
  }));
  return logId - 1;
}
const reset = () => http("/__reset", { method: "POST", headers: H });
const msg = (m) => http("/msg", { method: "POST", headers: H, body: JSON.stringify({ m }) });
const parse = (t) => { try { return JSON.parse(t); } catch { return {}; } };

let i = 0;
// 1. health / reset with valid token
let r = await http("/health", { headers: { Authorization: "Bearer " + TOKEN } });
console.log("health", log("evidencia:entrada", i++, "GET /health con token valido", { method: "GET", path: "/health", token: "team" }, r, `status ${r.status}`), r.status, r.text);
r = await reset();
console.log("reset", log("evidencia:entrada", i++, "POST /__reset con token valido", { method: "POST", path: "/__reset", token: "team" }, r, `status ${r.status}`), r.status, r.text);

// setup state
const setup = [["ALTA;Lucia;82"], ["ALTA;Mateo;3"], ["DEPOSITO;AC-0001;700;28"]];
for (const [m] of setup) {
  r = await msg(m);
  log("evidencia:setup", i++, "estado base: AC-0001 con 700, AC-0002 vacia", { m }, r, `${r.status} ${r.text}`);
}

// 2. leading zero control
for (const m of ["ALTA;Mateo;03", "ALTA;Mateo;3"]) {
  r = await msg(m);
  const id = log("evidencia:control", i++, "control con cero a la izquierda", { m }, r, `${r.status} ${r.text}`);
  console.log(id, m, r.status, r.text);
}

// 3. precedence: sweep control until the response is not E202/E201, log everything
async function find(body, hip) {
  for (let c = 0; c <= 99; c++) {
    const m = `${body};${c}`;
    r = await msg(m);
    const e = parse(r.text).error;
    const hit = e !== "E202" && e !== "E201";
    const id = log("evidencia:precedencia", i++, hip, { m }, r, hit ? `control valido ${c}: ${r.status} ${r.text}` : `control ${c} invalido`);
    if (hit) { console.log(id, m, r.status, r.text, "|", hip); return; }
  }
  console.log("no valid control for", body);
}
await find("TRANSFER;AC-9999;AC-0002;0", "E303 (monto) vs E401 (cuenta origen inexistente)");
await find("TRANSFER;AC-0001;AC-9999;500", "E401 solo en destino");
await find("TRANSFER;AC-0001;AC-0002;50001", "E506 (limite) vs E507 (saldo 700)");
await find("TRANSFER;AC-0001;AC-0001;0", "E303 (monto) vs E304 (misma cuenta)");
await find("TRANSFER;AC-0001;AC-0001;50001", "E304 (misma cuenta) vs E506 (limite)");
await find("TRANSFER;AC-9999;AC-9999;500", "E304 (misma cuenta) vs E401 (inexistente)");
await find("DEPOSITO;AC-9999;0", "E303 (monto) vs E401 (cuenta inexistente) en DEPOSITO");
await find("TRANSFER;AC-9999;AC-0002;50001", "E401 vs E506");
console.log(`calls ${calls}; log ids ${firstId}..${logId - 1}`);
