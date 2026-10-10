import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/)).filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, "")]),
);
const URL_ = env.CAJA_NEGRA_URL.replace(/\/$/, "");
const H = { Authorization: "Bearer " + env.CAJA_NEGRA_TOKEN_2, "Content-Type": "application/json" };
const LOG = "experimentos.jsonl";

let logId = fs.readFileSync(LOG, "utf8").trim().split(/\r?\n/).length + 1;
let last = 0;
export let calls = 0;

export async function reset() {
  await new Promise((r) => setTimeout(r, 150));
  await fetch(URL_ + "/__reset", { method: "POST", headers: H });
}

async function fetchRetry(m) {
  for (let a = 0; a < 6; a++) {
    try {
      const res = await fetch(URL_ + "/msg", { method: "POST", headers: H, body: JSON.stringify({ m }) });
      if (res.status === 429 || res.headers.get("x-frontier-infra")) throw new Error("rate-limit 429");
      return res;
    } catch (e) {
      if (String(e.message).includes("rate-limit")) throw e;
      await new Promise((r) => setTimeout(r, 800 + a * 500));
    }
  }
  throw new Error("fetch failed after retries: " + m);
}

export async function msg(m, seq, hipotesis, conclusion) {
  const w = last + 115 - Date.now();
  if (w > 0) await new Promise((r) => setTimeout(r, w));
  last = Date.now();
  calls++;
  const res = await fetchRetry(m);
  const t = await res.text();
  let j;
  try { j = JSON.parse(t); } catch { j = t; }
  const entry = { id: logId++, seq, x_req: res.headers.get("x-req"), hipotesis, request: { m }, status: res.status, response: j };
  if (conclusion) entry.conclusion = conclusion;
  fs.appendFileSync(LOG, JSON.stringify(entry) + "\n");
  return { s: res.status, j, t };
}

const bad = (r) => r.s === 400 && r.j && (r.j.error === "E202" || r.j.error === "E201");

export async function findControl(body, seq, hipotesis) {
  const order = [];
  for (let c = 3; c <= 98; c++) order.push(c);
  order.push(0, 1, 2);
  for (const c of order) {
    const r = await msg(`${body};${c}`, seq, hipotesis);
    if (!bad(r)) return c;
  }
  return null;
}
