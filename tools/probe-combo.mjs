import { msg, reset, findControl, calls } from "./sweep-lib.mjs";

const probes = [
  "CONSULTA;A",   // baseline r=0 (ctrl 98)
  "CONSULTA;B",   // baseline r=3 (ctrl 95)
  "XONSULTA;A",   // change first command char
  "CONSULTB;A",   // change last command char
  "CONSULTAA;A",  // command prefix longer
  "CONSULTA;AA",
  "CONSULTA;AB",
  "CONSULTA;BA",
  "CONSULTA;JJ",
  "CONSULTA;SS",
  "CONSULTA;A;A",
];
await reset();
for (const b of probes) {
  const c = await findControl(b, "probe-combo", `combinacion ${b}`);
  console.log(`${b} -> control=${c}`);
}
console.log("calls", calls);
