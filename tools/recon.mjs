import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

function loadEnv(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const env = { ...loadEnv(resolve(ROOT, ".env")), ...process.env };
const BASE_URL = (env.CAJA_NEGRA_URL || "").replace(/\/$/, "");
const TOKEN = env.CAJA_NEGRA_TOKEN;
const LOG_PATH = resolve(ROOT, "experimentos.jsonl");

if (!BASE_URL) throw new Error("CAJA_NEGRA_URL missing (.env)");
if (!TOKEN) throw new Error("CAJA_NEGRA_TOKEN missing (.env)");

const MIN_INTERVAL_MS = 100;
let lastSent = 0;

async function throttle() {
  const wait = MIN_INTERVAL_MS - (Date.now() - lastSent);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSent = Date.now();
}

function nextId() {
  if (!existsSync(LOG_PATH)) return 1;
  const text = readFileSync(LOG_PATH, "utf8").trim();
  if (!text) return 1;
  return text.split(/\r?\n/).length + 1;
}

let logId = nextId();

function appendLog(entry) {
  appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
}

function parseBody(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function raw({ method = "GET", path = "/", body }) {
  await throttle();
  const headers = {};
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    headers: res.headers,
    x_req: res.headers.get("x-req"),
    infra: res.headers.get("x-frontier-infra"),
    text,
    json: parseBody(text),
  };
}

export async function reset(seq = "reset") {
  return raw({ method: "POST", path: "/__reset" });
}

export async function probe({
  seq,
  hipotesis,
  m,
  path = "/msg",
  method = "POST",
  request,
  conclusion,
  log = true,
}) {
  const reqBody = request ?? { m };
  const r = await raw({ method, path, body: method === "POST" ? reqBody : undefined });
  const entry = {
    id: logId++,
    seq,
    x_req: r.x_req,
    hipotesis,
    request: reqBody,
    status: r.status,
    response: r.json,
  };
  if (conclusion !== undefined) entry.conclusion = conclusion;
  if (r.infra) entry.infra = r.infra;
  if (log) appendLog(entry);
  return { ...r, entry };
}

export async function probeSequence(seq, steps, { resetFirst = true } = {}) {
  if (resetFirst) await reset(seq);
  const out = [];
  for (const step of steps) out.push(await probe({ seq, ...step }));
  return out;
}

const isE202 = (r) => r.json && r.json.error === "E202";

async function cmdReplay() {
  const examplesPath = resolve(
    ROOT,
    "docs-hackathon/challenge/frontier-reto-2/pruebas/ejemplos.jsonl",
  );
  const examples = readFileSync(examplesPath, "utf8")
    .trim()
    .split(/\r?\n/)
    .map((l) => JSON.parse(l));

  await reset("ejemplos-replay");
  let pass = 0;
  for (const ex of examples) {
    const got = await probe({
      seq: "ejemplos-replay",
      hipotesis: `replay ejemplo n=${ex.n}`,
      request: ex.request,
      conclusion: `esperado status=${ex.status} body=${JSON.stringify(ex.response)}`,
    });
    const statusOk = got.status === ex.status;
    const bodyOk = JSON.stringify(got.json) === JSON.stringify(ex.response);
    const ok = statusOk && bodyOk;
    if (ok) pass++;
    console.log(
      `n=${String(ex.n).padStart(2)} ${ok ? "PASS" : "FAIL"} ` +
        `status ${got.status}${statusOk ? "==" : "!="}${ex.status} ` +
        `body=${JSON.stringify(got.json)}`,
    );
  }
  console.log(`\nReplay: ${pass}/${examples.length}`);
  process.exit(pass === examples.length ? 0 : 1);
}

async function cmdProbe(args) {
  const m = args.join(" ");
  if (!m) throw new Error('usage: node tools/recon.mjs probe "PING;64"');
  const r = await probe({ seq: "manual", hipotesis: "manual probe", m });
  console.log(JSON.stringify({ status: r.status, x_req: r.x_req, response: r.json }, null, 2));
}

async function cmdCrack(args) {
  const prefix = args.join(" ");
  if (!prefix) throw new Error('usage: node tools/recon.mjs crack "PING"');
  const seq = `crack:${prefix}`;
  await reset(seq);
  const passing = [];
  for (let n = 0; n <= 99; n++) {
    const control = String(n);
    const r = await probe({
      seq,
      hipotesis: `find valid control for "${prefix}"`,
      m: `${prefix};${control}`,
    });
    if (!isE202(r)) passing.push({ control, status: r.status, body: r.json });
  }
  console.log(`\nprefix: ${prefix}`);
  console.log("passing (not E202):", JSON.stringify(passing));
}

const [, , cmd, ...rest] = process.argv;
const commands = {
  replay: cmdReplay,
  probe: () => cmdProbe(rest),
  crack: () => cmdCrack(rest),
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  if (cmd && commands[cmd]) {
    await commands[cmd]();
  } else {
    console.log(`recon harness ready. BASE_URL=${BASE_URL} log=${LOG_PATH}`);
    console.log("commands:");
    console.log("  node tools/recon.mjs replay");
    console.log('  node tools/recon.mjs probe "PING;64"');
    console.log('  node tools/recon.mjs crack "PING"');
  }
}
