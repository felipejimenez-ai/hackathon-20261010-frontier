import { KNOWN_CONTROLS } from "./known-controls.mjs";

// Proposed model (not closed): control = norm(K - 3*h) with norm mapping 0,1 -> 97,98,
// h = fold(h*10 + g(ch)) mod 97 over the uppercased body.
// g: digit -> value; letter A=1..Z=26 reduced to -7..9 (mod 17); ';' -> 31; '-' -> 70.
// Validated only on CONSULTA;AC-#### bodies, so it is only used there.
const M = 97;
const K = 1;
const SEMI = 31;
const DASH = 70;

function g(ch) {
  if (ch >= "0" && ch <= "9") return ch.charCodeAt(0) - 48;
  if (ch >= "A" && ch <= "Z") {
    const x = (ch.charCodeAt(0) - 64) % 17;
    return x > 9 ? x - 17 : x;
  }
  if (ch === ";") return SEMI;
  if (ch === "-") return DASH;
  return 0;
}

export function modelControl(body) {
  let h = 0;
  for (const ch of body.toUpperCase()) h = (((h * 10 + g(ch)) % M) + M) % M;
  let c = (((K - 3 * h) % M) + M) % M;
  if (c < 2) c += M;
  return c;
}

const CONSULTA_ACCOUNT = /^CONSULTA;AC-\d{4}$/;

// Returns the expected control for covered bodies, or null (=> lenient).
export function expectedControl(body) {
  const key = body.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(KNOWN_CONTROLS, key)) return KNOWN_CONTROLS[key];
  if (CONSULTA_ACCOUNT.test(key)) return modelControl(key);
  return null;
}
