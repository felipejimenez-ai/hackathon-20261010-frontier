export const CONFIG = {
  port: Number(process.env.PORT || 8080),

  // id prefixes
  accountPrefix: "AC-",
  operationPrefix: "OP-",
  idPad: 4,

  // transfer limit (E506 above this). 120000 -> E506, 100000 -> ok.
  transferLimit: 100000,

  // controls
  control: {
    // "lenient": accept any numeric control (maximize pass on valid messages).
    // "hybrid":  E202 only for bodies with a known control (measured table or CONSULTA;AC-#### model);
    //            everything else lenient.
    mode: process.env.CONTROL_MODE || "hybrid",
  },

  // error contract: code -> { status, mensaje }
  errors: {
    E104: { status: 400, mensaje: "segmento vacío" },
    E201: { status: 400, mensaje: "control mal formado" },
    E202: { status: 400, mensaje: "control inválido" },
    E301: { status: 400, mensaje: "comando desconocido " },
    E302: { status: 400, mensaje: "aridad inválida" },
    E401: { status: 404, mensaje: "cuenta inexistente" },
    E402: { status: 404, mensaje: "operación inexistente" },
    E506: { status: 422, mensaje: "límite excedido" },
    E507: { status: 422, mensaje: "saldo insuficiente" },
  },

  // commands: name -> arity of argument fields (excluding command and control)
  commands: {
    ALTA: 1,
    CONSULTA: 1,
    DEPOSITO: 2,
    TRANSFER: 3,
    ANULA: 1,
  },

  // preserved typos
  depositStatus: "recieved",
};
