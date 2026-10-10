# Black Box Replica — System Design

**Challenge 2 · La caja negra · 2026-10-10**
Deliverables: this document + `architecture.png` (source `architecture.mmd`). Behavior spec: `docs/spec.md`;
evidence: `experimentos.jsonl`. `E:n` = line `n` of `ejemplos.jsonl`; `D1–D7` = decisions in §2 and the diagram.

## 1. Problem, assumptions, scope

Replace a 10-year undocumented HTTP service with a replica that returns the **same status and body**
(typos and errors included; JSON key order ignored, otherwise exact). Per-token state, `POST /__reset`,
≤5 s/step, never calls the original. The original **changes during the day**; the replica is judged against
the version live at 20:00.

**Known from probing** (`spec.md`): wire format `{"m":"CMD;arg;...;control"}`; command case-insensitive (E:11);
last field is a 1–2 digit control, `E201` malformed / `E202` wrong (E:17, E:2), `PING` ignores it (E:1);
per-token state with `AC-####`/`OP-####` counters; typos are contract (`"recieved"` E:6, `"comando desconocido "`
E:12); unknown route → `404` before auth, bad token → `401`.

**Assumptions** (not proven, each with how we check it):

| # | Assumption | Check |
|---|---|---|
| A1 | The evaluator drives one process, one token at a time, after `__reset`. | Single instance; no shared state (no DB). |
| A2 | The checksum is deterministic and state-independent. | Same body, different state, same control (probed). |
| A3 | Bodies we never measured follow the same rule as measured ones. | Hold out ~30% of probes; gate against all logged rows. |
| A4 | The service can change again before 20:00. | Re-run the differential battery near the deadline. |
| A5 | The evaluator's token has the same shape as ours. | Whitelist + same-shape fallback; never reject the team token. |

**Hard cases (why they drive the design):**
1. *Error precedence* — several checks can fail at once; one wrong order breaks a whole test.
2. *Control checksum* — mod-97, only partly closed; a wrong guess either rejects valid input or accepts invalid.
3. *`ANULA`* — idempotent **and** reverses balances; sequences of 6–12 steps expose any state bug.
4. *Mid-day change (v2)* — balance became a string, limit 100000→50000, new errors `E303/E304/E100/E102/E103`.

**Out of scope, and why:** database/persistence (`__reset` must be instant, single-process evaluation);
HTTP headers (not scored); throughput beyond 10 req/s and multi-instance state (A1); calling the original at
runtime (forbidden, scores 0).

## 2. Architecture and trade-offs

Pipeline (`architecture.png`): route resolve → auth → body parse → split → integrity → dispatch →
handlers + token store → serializer; each stage is one spec section (Entrada, Integridad, Comandos,
Memoria, Errores). Parameters live in `config.mjs`.

| ID | Decision | Discarded alternative | Why |
|---|---|---|---|
| D1 | Staged pipeline, order = error precedence | One big `switch` | Stage = spec section; precedence is the stage order, traceable. |
| D2 | Deterministic rules | LLM in the loop | 5 s cap, nondeterminism and cost on the hot path. |
| D3 | In-memory per-token store | Database | `__reset` must be instant; no persistence needed. |
| D4 | Hybrid checksum: mod-97 model + measured table, `E202` only where the control is known | Fully lenient; or lookup table only | Lenient never rejects valid input but misses `E202`; a table cannot generalize. |
| D5 | Parameters as data (`config.mjs`) | Hardcoded constants | v2 changed values; a data edit survives replay. |
| D6 | Differential oracle against the original | Re-probing by hand | Diff on the logged corpus; any difference is a change. |
| D7 | Probe first, derive spec from evidence | Spec first | Behavior unknown; assumed behavior would be unverifiable. |

**Main residual risk:** a wrong control on an unmeasured body is accepted (spec RI-1). Mitigation: close
letter weights via the mod-97 linear system; enable strict mode only after holdout validation.

## 3. Plan to measure (defined before building, enforced as gates)

| Metric | Target | How measured | Blocking? |
|---|---|---|---|
| `/evento` pass rate | 100/100, never decreasing | validate entrypoint after each change | yes |
| Replay `ejemplos.jsonl` after `__reset` | 20/20 | `tools/local-test-v2.mjs` | yes |
| Checksum vs all logged probes | 0 mismatches | `tools/gate.mjs` | yes |
| Step latency | p95 ≪ 5 s | local timing on the test run | yes |
| Spec rows citing a log id | 100% | review `spec.md` against `experimentos.jsonl` | no |
| Change detection | run before deadline | `tools/incident.mjs` differential battery | no |

**Learning loop:** probe → log one line (hypothesis + conclusion) → infer rule → encode in config/table →
gate. Reserve ~30% of probes as holdout so rules generalize instead of memorizing.

**Concrete cases (expected result):**

| Case | Input | Expected |
|---|---|---|
| Stateless | `PING;64` (E:1) | 200 `{"pong":true}` |
| Wrong control | `ALTA;Lucia;83` (E:2) | 400 `E202` |
| Malformed control | `DEPOSITO;AC-0002;700;5X` (E:17) | 400 `E201` |
| Arity | `ALTA;Lucia;Gomez;11` (E:20) | 400 `E302` |
| Precedence | `TRANSFER;AC-0001;AC-0001;0` + valid control | `E303` before `E304` |
| Limit edge | `TRANSFER` 50000 vs 50001 | ok vs `E506` |
| Memory | `DEPOSITO` → `CONSULTA` → `ANULA` ×2 | balance up, restored, then `ya anulada` |
| Routing/auth | `GET /msg`, unknown path, no token | `404 E404`, `404 E404`, `401 E001` |
| Body | empty body / `{}` | 400 `E100` / 400 `E102` |

**Status (now):** replay 20/20 (v2) and gate 0 mismatches over 8,967 covered probe rows.
