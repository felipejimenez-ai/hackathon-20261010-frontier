import fs from "node:fs";

// Differential battery to find the 3 incident changes (v2 vs v1 oracle).
// Run: node tools/incident.mjs  (needs CAJA_NEGRA_URL + a live token)
// Token: CAJA_NEGRA_TOKEN_2 if set, else CAJA_NEGRA_TOKEN.
const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([^#=]+?)\s*=\s*(.*)$/))
    .filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")])
);
const URL = env.CAJA_NEGRA_URL.replace(/\/$/, "");
const TOKEN = env.CAJA_NEGRA_TOKEN_2 || env.CAJA_NEGRA_TOKEN;
const H = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };
const call = async (m) => {
  const r = await fetch(URL + "/msg", { method: "POST", headers: H, body: JSON.stringify({ m }) });
  return { status: r.status, body: await r.text() };
};
const reset = () => fetch(URL + "/__reset", { method: "POST", headers: H });

const SAMPLES = JSON.parse("[" + fs.readFileSync("docs-hackathon/challenge/frontier-reto-2/pruebas/ejemplos.jsonl", "utf8").trim().split(/\r?\n/).filter(Boolean).join(",") + "]");

// Targeted sequences: each probes a dimension. Controls are known-valid v1 controls;
// if v2 changed them we will see E202 and that itself is the signal.
const SEQUENCES = {
  "samples": SAMPLES.map((s) => s.request.m),
  "ids": ["ALTA;A;72", "ALTA;A;72", "ALTA;A;72", "CONSULTA;AC-0001;14", "CONSULTA;AC-0003;8"],
  "limite": ["ALTA;A;72", "ALTA;A;72", "DEPOSITO;AC-0001;700;28",
             "TRANSFER;AC-0001;AC-0002;40000;86", "TRANSFER;AC-0001;AC-0002;100000;12",
             "TRANSFER;AC-0001;AC-0002;120000;55", "TRANSFER;AC-0001;AC-0002;50000;23"],
  "anula-deposito": ["ALTA;A;72", "DEPOSITO;AC-0001;700;28", "CONSULTA;AC-0001;14",
                     "ANULA;OP-0001;72", "CONSULTA;AC-0001;14", "ANULA;OP-0001;72"],
  "errores": ["CONSULTA;AC-0009;87", "ANULA;OP-0009;?", "SALDOS;AC-0001;38", "ALTA;Lucia;Gomez;11", "CONSULTA;;0"],
  "case": ["ALTA;Lucia;82", "CONSULTA;a;98", "consulta;AC-0001;14"],
};

const expected = new Map(SAMPLES.map((s) => [s.request.m, { status: s.status, body: JSON.stringify(s.response) }]));

const report = [];
for (const [name, seq] of Object.entries(SEQUENCES)) {
  await reset();
  for (const m of seq) {
    const got = await call(m);
    const exp = expected.get(m);
    const diff = exp ? (exp.status !== got.status || exp.body !== got.body) : null;
    const line = { seq: "incidente:" + name, m, got, v1: exp || null, diff };
    report.push(line);
    const tag = diff === null ? "observar" : diff ? "DIFF" : "ok";
    console.log(`[${name}] ${tag} ${m} -> ${got.status} ${got.body}${exp ? ` (v1: ${exp.status} ${exp.body})` : ""}`);
  }
}

// Append to the experiment log with hipotesis/conclusion, as the ticket requires.
const lines = report.map((r, i) => JSON.stringify({
  id: 10000 + i,
  seq: r.seq,
  x_req: String(i),
  hipotesis: "detectar cambio de comportamiento v2 comparando contra v1",
  request: { m: r.m },
  status: r.got.status,
  response: r.got.body,
  conclusion: r.diff === null ? `observado (sin oraculo v1): ${r.got.status} ${r.got.body}`
    : r.diff ? `CAMBIO: v1=${r.v1.status} ${r.v1.body} v2=${r.got.status} ${r.got.body}`
    : "igual a v1",
}));
fs.appendFileSync("experimentos.jsonl", "\n" + lines.join("\n"));
const diffs = report.filter((r) => r.diff);
console.log(`\n=== ${diffs.length} diffs vs v1 en secuencias con control conocido ===`);
console.log(`observados sin oraculo: ${report.filter((r) => r.diff === null).length}`);
