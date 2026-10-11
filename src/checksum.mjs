// Closed checksum model (validated against all logged probes: every accepted body matches, no
// E202 body ever matches).
//
//   N       = concatenation of decimal digits of the uppercased body, where ';' and '-' and any
//             other non [0-9A-Z] character are skipped, digits stay as-is and letters become
//             A=1 .. Z=26 written in decimal (so J -> "10", a letter can add one or two digits).
//   control = (1 - 3*N) mod 97, with 0 and 1 mapped to 97 and 98.
//
// The "non linear" behavior seen earlier came from letters >= J adding two digits (the weight of
// the following characters is 100, not 10).
const M = 97;
const K = 1;
const MULT = 3;

export function modelControl(body) {
  let r = 0;
  for (const ch of body.toUpperCase()) {
    let digits = "";
    if (ch >= "0" && ch <= "9") digits = ch;
    else if (ch >= "A" && ch <= "Z") digits = String(ch.charCodeAt(0) - 64);
    for (const d of digits) r = (r * 10 + (d.charCodeAt(0) - 48)) % M;
  }
  let c = (((K - MULT * r) % M) + M) % M;
  if (c < 2) c += M;
  return c;
}

// Expected control for any body (the model covers every body).
export function expectedControl(body) {
  return modelControl(body);
}
