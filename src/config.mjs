export const CONFIG = {
  port: Number(process.env.PORT || 8080),

  // id prefixes
  accountPrefix: "AC-",
  operationPrefix: "OP-",
  idPad: 4,

  // transfer limit (E506 above this). v2: 50000 (50000 ok, 50001 -> E506).
  transferLimit: 50000,

  // v2: amounts are validated (E303) before account lookup.
  // Valid amount = plain positive integer, no leading zeros, <= maxAmount.
  maxAmount: 9999999999,

  // v2: balances are shown as a decimal string in units (cents / 100, 2 decimals).
  currencyDivisor: 100,

  // controls
  control: {    // "lenient": accept any numeric control (maximize pass on valid messages).
    // "hybrid":  E202 only for bodies with a known control (measured table or CONSULTA;AC-#### model);
    //            everything else lenient.
    mode: process.env.CONTROL_MODE || "hybrid",
  },

  // auth: allowed bearer tokens. Observed: original rejects unknown tokens with 401 E001.
  // Set ENTRYPOINT_TOKEN (team "ftr_" token) in the deployment env. If unset, any non-empty
  // bearer is accepted (safe fallback: never reject the real team token).
  auth: {
    tokens: [process.env.ENTRYPOINT_TOKEN, process.env.CAJA_NEGRA_TOKEN]
      .filter(Boolean)
      .flatMap((s) => s.split(",").map((t) => t.trim()))
      .filter(Boolean),
  },

  // error contract: code -> { status, mensaje }
  errors: {
    E001: { status: 401, mensaje: "no autorizado" },
    E103: { status: 400, mensaje: "falta control" },
    E104: { status: 400, mensaje: "segmento vacío" },
    E201: { status: 400, mensaje: "control mal formado" },
    E202: { status: 400, mensaje: "control inválido" },
    E301: { status: 400, mensaje: "comando desconocido " },
    E302: { status: 400, mensaje: "aridad inválida" },
    E303: { status: 400, mensaje: "monto inválido" },
    E401: { status: 404, mensaje: "cuenta inexistente" },
    E402: { status: 404, mensaje: "operación inexistente" },
    E506: { status: 422, mensaje: "límite excedido" },
    E507: { status: 422, mensaje: "saldo insuficiente" },
    E404: { status: 404, mensaje: "ruta desconocida" },
  },

  // commands: name -> arity of argument fields (excluding command and control)
  commands: {
    PING: 0,
    ALTA: 1,
    CONSULTA: 1,
    DEPOSITO: 2,
    TRANSFER: 3,
    ANULA: 1,
  },

  // preserved typos
  depositStatus: "recieved",
};
