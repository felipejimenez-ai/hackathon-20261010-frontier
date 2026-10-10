import http from "node:http";
import { fileURLToPath } from "node:url";
import { CONFIG } from "./config.mjs";
import { expectedControl } from "./checksum.mjs";

const pad = (n) => String(n).padStart(CONFIG.idPad, "0");

function parseAmount(raw) {
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

function freshState() {
  return {
    accounts: new Map(),
    operations: new Map(),
    accountSeq: 0,
    operationSeq: 0,
  };
}

const states = new Map();
function stateFor(token) {
  let s = states.get(token);
  if (!s) {
    s = freshState();
    states.set(token, s);
  }
  return s;
}

function errorBody(code) {
  const e = CONFIG.errors[code];
  return { status: e.status, body: { error: code, mensaje: e.mensaje } };
}

function takeOperation(state, type) {
  state.operationSeq += 1;
  const id = `${CONFIG.operationPrefix}${pad(state.operationSeq)}`;
  const op = { id, type, annulled: false };
  state.operations.set(id, op);
  return op;
}

const handlers = {
  ALTA(state, args) {
    const [name] = args;
    state.accountSeq += 1;
    const id = `${CONFIG.accountPrefix}${pad(state.accountSeq)}`;
    state.accounts.set(id, { id, name, saldo: 0 });
    return { status: 201, body: { cuentaId: id } };
  },

  CONSULTA(state, args) {
    const [id] = args;
    const acc = state.accounts.get(id);
    if (!acc) return errorBody("E401");
    return { status: 200, body: { cuenta_id: id, saldo: acc.saldo } };
  },

  DEPOSITO(state, args) {
    const [id, amountRaw] = args;
    const acc = state.accounts.get(id);
    if (!acc) return errorBody("E401");
    const amount = parseAmount(amountRaw);
    if (amount === null) return errorBody("E201");
    acc.saldo += amount;
    const op = takeOperation(state, "DEPOSITO");
    op.undo = () => { acc.saldo -= amount; };
    return { status: 200, body: { status: CONFIG.depositStatus, operacionId: op.id } };
  },

  TRANSFER(state, args) {
    const [fromId, toId, amountRaw] = args;
    const from = state.accounts.get(fromId);
    const to = state.accounts.get(toId);
    if (!from || !to) return errorBody("E401");
    const amount = parseAmount(amountRaw);
    if (amount === null) return errorBody("E201");
    if (amount > CONFIG.transferLimit) return errorBody("E506");
    if (from.saldo < amount) return errorBody("E507");
    from.saldo -= amount;
    to.saldo += amount;
    const op = takeOperation(state, "TRANSFER");
    op.undo = () => { from.saldo += amount; to.saldo -= amount; };
    return { status: 200, body: { status: CONFIG.depositStatus, operacionId: op.id } };
  },

  ANULA(state, args) {
    const [opId] = args;
    const op = state.operations.get(opId);
    if (!op) return errorBody("E402");
    if (op.annulled) return { status: 200, body: { ok: false, motivo: "ya anulada" } };
    op.annulled = true;
    // Evidence: samples n16/n19 only fit if ANULA reverses the transfer's balance effects.
    if (op.undo) op.undo();
    return { status: 200, body: { ok: true, anulada: opId } };
  },
};

export function handleMessage(state, m) {
  if (typeof m !== "string") return errorBody("E302");
  const segments = m.split(";");
  const cmd = segments[0].toUpperCase();

  if (cmd === "PING") return { status: 200, body: { pong: true } };

  if (segments.some((s) => s === "")) return errorBody("E104");

  const control = segments[segments.length - 1];
  if (!/^\d+$/.test(control)) return errorBody("E201");
  if (control.length > 1 && control[0] === "0") return errorBody("E202");

  const args = segments.slice(1, -1);

  if (!Object.prototype.hasOwnProperty.call(CONFIG.commands, cmd)) return errorBody("E301");
  if (args.length !== CONFIG.commands[cmd]) return errorBody("E302");

  if (CONFIG.control.mode === "hybrid") {
    const expected = expectedControl(segments.slice(0, -1).join(";"));
    if (expected !== null && Number(control) !== expected) return errorBody("E202");
  }

  return handlers[cmd](state, args);
}

function send(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(payload);
}

export function createServer() {
  return http.createServer((req, res) => {
    const path = (req.url || "/").split("?")[0];
    const method = req.method || "GET";

    // Readiness probe: responds 200 without auth (entrypoint validation).
    if (method === "GET" && path === "/health") {
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end("ok");
    }

    const isReset = method === "POST" && path === "/__reset";
    const isMsg = method === "POST" && path === "/msg";

    // Routing resolves before auth. Observed: unknown route/method -> 404 E404 (no token needed).
    if (!isReset && !isMsg) {
      const e = CONFIG.errors.E404;
      return send(res, e.status, { error: "E404", mensaje: e.mensaje });
    }

    // Auth. Observed: missing or bogus token -> 401 E001. If allowed tokens are configured
    // (ENTRYPOINT_TOKEN env), reject anything else; otherwise accept any non-empty bearer.
    const auth = req.headers["authorization"] || "";
    const match = /^Bearer\s+(.+)$/i.exec(auth);
    const token = match ? match[1].trim() : "";
    if (!token) {
      const e = CONFIG.errors.E001;
      return send(res, e.status, { error: "E001", mensaje: e.mensaje });
    }
    if (CONFIG.auth.tokens.length && !CONFIG.auth.tokens.includes(token)) {
      const e = CONFIG.errors.E001;
      return send(res, e.status, { error: "E001", mensaje: e.mensaje });
    }
    const state = stateFor(token);

    if (isReset) {
      states.set(token, freshState());
      return send(res, 200, { ok: true });
    }

    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let parsed;
      try {
        parsed = JSON.parse(raw || "{}");
      } catch {
        return send(res, 400, { error: "E302", mensaje: CONFIG.errors.E302.mensaje });
      }
      const out = handleMessage(state, parsed.m);
      return send(res, out.status, out.body);
    });
  });
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const server = createServer();
  server.listen(CONFIG.port, "0.0.0.0", () => {
    console.log(`replica listening on 0.0.0.0:${CONFIG.port}`);
  });
}
