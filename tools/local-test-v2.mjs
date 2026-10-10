import { handleMessage } from "../src/server.mjs";

// Expected v2 responses (captured from the live service, ticket FR-0153).
const SEQ = [
  ["PING;64", 200, { pong: true }],
  ["ALTA;Lucia;83", 400, { error: "E202", mensaje: "control inválido" }],
  ["ALTA;Lucia;82", 201, { cuentaId: "AC-0001" }],
  ["ALTA;Mateo;3", 201, { cuentaId: "AC-0002" }],
  ["CONSULTA;AC-0001;14", 200, { cuenta_id: "AC-0001", saldo: "0.00" }],
  ["DEPOSITO;AC-0001;250000;86", 200, { status: "recieved", operacionId: "OP-0001" }],
  ["TRANSFER;AC-0001;AC-0002;40000;86", 200, { status: "recieved", operacionId: "OP-0002" }],
  ["CONSULTA;AC-0002;11", 200, { cuenta_id: "AC-0002", saldo: "400.00" }],
  ["TRANSFER;AC-0001;AC-0002;120000;55", 422, { error: "E506", mensaje: "límite excedido" }],
  ["TRANSFER;AC-0001;AC-0002;100000;12", 422, { error: "E506", mensaje: "límite excedido" }],
  ["CONSULtA;AC-0001;14", 200, { cuenta_id: "AC-0001", saldo: "2100.00" }],
  ["SALDOS;AC-0001;38", 400, { error: "E301", mensaje: "comando desconocido " }],
  ["ANULA;OP-0003;66", 404, { error: "E402", mensaje: "operación inexistente" }],
  ["ANULA;OP-0003;66", 404, { error: "E402", mensaje: "operación inexistente" }],
  ["CONSULTA;AC-0009;87", 404, { error: "E401", mensaje: "cuenta inexistente" }],
  ["TRANSFER;AC-0002;AC-0001;50000;23", 422, { error: "E507", mensaje: "saldo insuficiente" }],
  ["DEPOSITO;AC-0002;700;5X", 400, { error: "E201", mensaje: "control mal formado" }],
  ["DEPOSITO;AC-0002;700;35", 200, { status: "recieved", operacionId: "OP-0003" }],
  ["CONSULTA;AC-0002;11", 200, { cuenta_id: "AC-0002", saldo: "407.00" }],
  ["ALTA;Lucia;Gomez;11", 400, { error: "E302", mensaje: "aridad inválida" }],
];

const state = { accounts: new Map(), operations: new Map(), accountSeq: 0, operationSeq: 0 };
let pass = 0;
for (const [i, [m, es, eb]] of SEQ.entries()) {
  const got = handleMessage(state, m);
  const ok = got.status === es && JSON.stringify(got.body) === JSON.stringify(eb);
  if (ok) pass++;
  console.log(`n=${i + 1} ${ok ? "PASS" : "FAIL"} ${m} -> ${got.status} ${JSON.stringify(got.body)}` +
    (ok ? "" : `  exp ${es} ${JSON.stringify(eb)}`));
}
console.log(`\nv2 replay: ${pass}/${SEQ.length}`);

// Extra stateless / stateful checks for v2 error paths.
const state2 = { accounts: new Map(), operations: new Map(), accountSeq: 0, operationSeq: 0 };
const EXTRA = [
  ["PING", 400, { error: "E103", mensaje: "falta control" }],
  ["ALTA;Lucia;100", 400, { error: "E201", mensaje: "control mal formado" }],
  ["CONSULTA;;0", 400, { error: "E104", mensaje: "segmento vacío" }],
  ["CONSULTA;AC-0001", 400, { error: "E201", mensaje: "control mal formado" }],
];
let pass2 = 0;
for (const [m, es, eb] of EXTRA) {
  const g = handleMessage(state2, m);
  const ok = g.status === es && JSON.stringify(g.body) === JSON.stringify(eb);
  if (ok) pass2++;
  else console.log(`EXTRA FAIL ${m} -> ${g.status} ${JSON.stringify(g.body)} exp ${es} ${JSON.stringify(eb)}`);
}
// E304: same-account transfer (after two accounts exist).
handleMessage(state2, "ALTA;Lucia;82");
handleMessage(state2, "ALTA;Mateo;3");
// control for TRANSFER;AC-0001;AC-0001;<amt> unknown to the model; use the two known bodies:
const e304 = handleMessage(state2, "TRANSFER;AC-0001;AC-0001;500;78");
const ok304 = e304.status === 400 && e304.body.error === "E304";
if (ok304) pass2++;
else console.log(`EXTRA FAIL TRANSFER same -> ${e304.status} ${JSON.stringify(e304.body)}`);
console.log(`extra: ${pass2}/${EXTRA.length + 1}`);

