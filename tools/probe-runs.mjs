import { reset, findControl, calls } from "./sweep-lib.mjs";
const bodies = [
  "CONSULTA;J", "CONSULTA;JJ", "CONSULTA;JJJ", "CONSULTA;JJJJ",
  "CONSULTA;S", "CONSULTA;SS", "CONSULTA;SSS",
  "CONSULTA;AJ", "CONSULTA;JA",
  "CONSULTA;AJA", "CONSULTA;AAJ", "CONSULTA;JAA",
];
await reset();
for (const b of bodies) {
  const c = await findControl(b, "probe-runs", `run ${b}`);
  console.log(`${b} -> control=${c} r=${(98 - c + 97) % 97}`);
}
console.log("calls", calls);
