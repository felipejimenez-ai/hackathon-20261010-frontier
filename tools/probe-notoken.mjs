import fs from "node:fs";

const env = Object.fromEntries(
  fs.readFileSync(".env", "utf8").split(/\r?\n/)
    .map((l) => l.match(/^\s*([^#=]+?)\s*=\s*(.*)$/))
    .filter(Boolean).map((m) => [m[1], m[2].replace(/^"|"$/g, "")])
);
const u = env.CAJA_NEGRA_URL.replace(/\/$/, "");

const cases = [
  ["GET", "/health", null, null],
  ["POST", "/__reset", null, null],
  ["POST", "/msg", { m: "ALTA;Lucia;82" }, null],
  ["POST", "/msg", { m: "ALTA;Lucia;82" }, "bogus-token-123"],
  ["POST", "/msg", { m: "PING;0" }, "bogus-token-123"],
  ["POST", "/__reset", null, "bogus-token-123"],
  ["GET", "/health", null, "bogus-token-123"],
  ["GET", "/nope", null, null],
  ["POST", "/nope", null, null],
  ["GET", "/msg", null, null],
  ["GET", "/", null, null],
  ["POST", "/msg", {}, null],
  ["POST", "/msg", null, null],
];

const out = [];
for (const [method, path, body, token] of cases) {
  const headers = {};
  if (token) headers.Authorization = "Bearer " + token;
  if (body !== null) headers["Content-Type"] = "application/json";
  let status, ct, text;
  try {
    const r = await fetch(u + path, { method, headers, body: body === null ? undefined : JSON.stringify(body) });
    status = r.status;
    ct = r.headers.get("content-type");
    text = await r.text();
  } catch (e) {
    status = "ERR"; ct = ""; text = String(e);
  }
  const rec = { method, path, token: token ? "bogus" : "none", status, ct, text };
  out.push(rec);
  console.log(`${method} ${path} token=${rec.token} -> ${status} [${ct}] ${text}`);
}
fs.writeFileSync("tools/probe-notoken.json", JSON.stringify(out, null, 2));
