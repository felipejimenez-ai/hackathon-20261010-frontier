# Blackbox Replica — Tasks

## 1. Recon & evidence

- [x] 1.1 Write recon harness (`tools/recon.mjs`): `__reset` + probe battery, `≤10 req/s`, append every probe to `experimentos.jsonl` (`id, seq, x_req, hipotesis, request, status, response, conclusion`)
- [x] 1.2 Replay `ejemplos.jsonl` and assert 20/20 reproduction
- [~] 1.3 Sweep control values per message to recover `control = f(msg)` — additive model found (`control = K + Σ v(char)·w[dist] mod 100`); w1..w20 + per-char values measured; closed form not pinned; tables in `tools/control-dataset.json`, `tools/weights.json`
- [ ] 1.4 Test control state dependence (same message twice after one reset)
- [ ] 1.5 Probe error precedence (unknown cmd × bad control × arity)
- [ ] 1.6 Probe memory semantics (ANULA restoring balance, counters, id rollover)

## 2. Service core

- [x] 2.1 Scaffold single-process HTTP server with `GET /health`, `POST /__reset`, catch-all route
- [x] 2.2 Implement token router with per-token isolated state
- [x] 2.3 Implement parser (`split(";")`, control = last field)
- [x] 2.4 Implement config module (limits, checksum params, id prefixes, typo table)
- [x] 2.5 Implement exact serializer (typos preserved, JSON key-order agnostic)

## 3. Commands

- [x] 3.1 `PING` → `{"pong":true}`
- [x] 3.2 `ALTA` → `AC-####` creation
- [x] 3.3 `CONSULTA` → balance response
- [x] 3.4 `DEPOSITO` → credit + `OP-####`
- [x] 3.5 `TRANSFER` → move funds + `OP-####`
- [x] 3.6 `ANULA` → idempotent annulment
- [x] 3.7 Case-insensitive dispatch

## 4. Integrity & errors

- [x] 4.1 Control validation (`E201` malformed / `E202` invalid) — `E201` exact; `E202` lenient pending checksum
- [x] 4.2 Ordered error mapper (`E301`, `E302`, `E401`, `E402`, `E506`, `E507`, `E104`)
- [~] 4.3 Unknown route / method mirroring — supuesto (404 `{}`), not probed
- [~] 4.4 Bad/missing token mirroring — supuesto (treated as normal), not probed

## 5. Deploy & validate

- [ ] 5.1 Deploy entrypoint (public URL, team token), verify `GET /health`
- [x] 5.2 Write regression harness covering spec scenarios (`tools/local-test.mjs`, 14/20; rest blocked on checksum)
- [ ] 5.3 Validate on `/evento`, iterate until pass rate is monotonic non-decreasing
- [x] 5.4 Author `spec.md` (behaviors with ID | Comportamiento | Evidencia | Confianza + 7 sections) → `docs/spec.md`
- [ ] 5.5 Record 2-minute demo video
