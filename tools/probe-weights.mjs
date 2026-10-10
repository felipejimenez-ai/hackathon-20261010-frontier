import { msg, reset, findControl, calls } from "./sweep-lib.mjs";

const BASE = "AAA;AAA"; // 3 args? command AAA, then args... arity unknown but checksum checked first
const chars = [...BASE];
const results = [];
await reset();
const c0 = await findControl(BASE, "probe-weights", "control base AAA;AAA");
console.log(`BASE=${BASE} control=${c0}`);
results.push([-1, c0]);
for (let k = 0; k < chars.length; k++) {
  const arr = chars.slice();
  arr[k] = "B";
  const body = arr.join("");
  const c = await findControl(body, "probe-weights", `A->B en pos ${k}: ${body}`);
  console.log(`pos ${k} (${chars[k]}) -> ${body} control=${c}`);
  results.push([k, c]);
}
// separator value test
{
  const body = "AAA-AAA";
  const c = await findControl(body, "probe-weights", "separador - vs ;");
  console.log(`sep: ${body} control=${c}`);
}
console.log("calls", calls);
const M = 97, mod = (x) => ((x % M) + M) % M;
const r0 = mod(98 - c0);
console.log("base r", r0);
for (const [k, c] of results) if (k >= 0) console.log(`pos ${k}: delta_r=${mod(mod(98 - c) - r0)}`);
