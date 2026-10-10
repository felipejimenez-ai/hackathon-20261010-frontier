const w = [97, 70, 91, 7, 73, 21, 19, 66, 51, 95].map((x) => (x % 100 + 100) % 100);
const mod = (a) => ((a % 100) + 100) % 100;
const fits = [];
for (let A = 0; A < 100; A++) {
  for (let B = 0; B < 100; B++) {
    let ok = true;
    for (let d = 2; d < w.length; d++) {
      if (mod(A * w[d - 1] + B * w[d - 2]) !== w[d]) { ok = false; break; }
    }
    if (ok) fits.push({ A, B });
  }
}
console.log("order2:", JSON.stringify(fits));
// order 3
const fits3 = [];
for (let A = 0; A < 100; A++) for (let B = 0; B < 100; B++) for (let C = 0; C < 100; C++) {
  let ok = true;
  for (let d = 3; d < w.length; d++) if (mod(A * w[d - 1] + B * w[d - 2] + C * w[d - 3]) !== w[d]) { ok = false; break; }
  if (ok) fits3.push({ A, B, C });
}
console.log("order3 count:", fits3.length, JSON.stringify(fits3.slice(0, 10)));
