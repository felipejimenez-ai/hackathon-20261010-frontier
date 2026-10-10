const obs = [97, 70, 91, 7, 73, 21, 19, 66, 51, 95];
const inv = (a, m) => {
  for (let x = 1; x < m; x++) if ((a * x) % m === 1) return x;
  return 0;
};
const hits = [];
for (let M = 50; M <= 2000; M++) {
  for (let B = 2; B <= 300; B++) {
    const k = [];
    let p = 1;
    for (let d = 0; d < 10; d++) { k.push(p % M); p = (p * B) % M; }
    if (k[0] === 0) continue;
    const ik = inv(k[0], M);
    if (!ik) continue;
    const F = (obs[0] * ik) % M;
    if (F === 0) continue;
    let ok = true;
    for (let d = 0; d < 10; d++) {
      const v = (F * k[d]) % M;
      if (v % 100 !== obs[d]) { ok = false; break; }
    }
    if (ok) hits.push({ M, B, F });
  }
}
console.log(`hits: ${hits.length}`);
for (const h of hits.slice(0, 40)) console.log(JSON.stringify(h));
