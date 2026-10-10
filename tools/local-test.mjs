import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createServer } from "../src/server.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const examples = readFileSync(
  resolve(ROOT, "docs-hackathon/challenge/frontier-reto-2/pruebas/ejemplos.jsonl"),
  "utf8",
)
  .trim()
  .split(/\r?\n/)
  .map((l) => JSON.parse(l));

const server = createServer();
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const token = "test-token";

async function post(path, body) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, body: json };
}

await post("/__reset", {});

let pass = 0;
for (const ex of examples) {
  const got = await post("/msg", ex.request);
  const ok = got.status === ex.status && JSON.stringify(got.body) === JSON.stringify(ex.response);
  if (ok) pass++;
  console.log(
    `n=${String(ex.n).padStart(2)} ${ok ? "PASS" : "FAIL"} ` +
      `status ${got.status}${got.status === ex.status ? "==" : "!="}${ex.status} ` +
      `got=${JSON.stringify(got.body)} exp=${JSON.stringify(ex.response)}`,
  );
}
console.log(`\nLocal replay: ${pass}/${examples.length}`);
server.close();
process.exit(pass === examples.length ? 0 : 1);
