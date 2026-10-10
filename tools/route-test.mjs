import { spawn } from "node:child_process";
const p = spawn(process.execPath, ["src/server.mjs"], { env: process.env });
await new Promise(r => setTimeout(r, 800));
const b = "http://127.0.0.1:8080";
async function call(method, path, body, token) { const h = {}; if (token) h.Authorization = "Bearer " + token; if (body) h["Content-Type"] = "application/json"; const r = await fetch(b + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined }); return [r.status, await r.text()]; }
const team = process.env.ENTRYPOINT_TOKEN;
console.log("team token set:", !!team, "len", (team||"").length);
console.log("team valid:", await call("POST", "/__reset", null, team), await call("POST", "/msg", { m: "ALTA;Lucia;82" }, team));
console.log("bogus:", await call("POST", "/msg", { m: "ALTA;Lucia;82" }, "not-the-team"));
console.log("none:", await call("POST", "/msg", { m: "ALTA;Lucia;82" }));
console.log("nope:", await call("GET", "/nope"));
p.kill();
