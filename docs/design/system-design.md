# Black Box Replica — System Design

**Challenge 2 · La caja negra · 2026-10-10**
Deliverables: this document + `architecture.png` (source `architecture.mmd`).

---

## 1. Problem & scope

Build a **byte-identical replica** of a 10-year undocumented HTTP service. The replica must
return the **same status and same body** as the original — errors *and* typos included (JSON key
order irrelevant, otherwise exact bytes). Per-token isolated state, `POST /__reset` to initial
state, `≤5 s` per step, and it **must never call the original or another replica at runtime**.

**Assumptions** (derived from the 20 samples in `ejemplos.jsonl`; to confirm in the recon phase).
Evidence ids use `E:n` = sample line `n`.

- Commands: `PING, ALTA, CONSULTA, DEPOSITO, TRANSFER, ANULA`; dispatch is **case-insensitive**
  (`CONSULta` ≡ `CONSULTA`, E:11).
- A message splits on `;`; the **last field is a control checksum**. `E201` = malformed
  (non-numeric, `5X`, E:17); `E202` = well-formed but wrong value (E:2).
- State is **per token, in-memory**: account balances, incremental ids `AC-####` / `OP-####`,
  annulled-operation set.
- Unknown command → `E301` `"comando desconocido "` (note trailing space, E:12); wrong arity →
  `E302` (E:20). `E401` = missing entity (E:15); `E506` = limit (E:9); `E507` = insufficient
  funds (E:16).
- Response typos preserved verbatim (`"recieved"`, E:6).

**Hard cases** (these drive the design):

- **Error precedence** when several conditions fail at once (e.g. unknown command *and* bad
  control).
- **Control algorithm unknown** — must be reverse-engineered (see §3).
- **Idempotent `ANULA`** (`ok:false,"ya anulada"`, E:13→14).
- **Balance memory across requests** (E:11 = `250000−40000−100000`; recovery after `ANULA`
  unproven).
- **Unknown routes**, `GET /msg`, and **bad/missing token** must mimic the original exactly.

**Out of scope — and why:**

- Real persistence / database: `__reset` must be instantaneous and state is ephemeral; the
  evaluation talks to one process.
- HTTP header comparison: explicitly **not scored**.
- Performance beyond 10 req/s and multi-instance coordination: single-process evaluation.
- Delegating to the original from the replica: **forbidden** — doing so scores 0.

---

## 2. Architecture & trade-offs

Pipeline (see `architecture.png`): Entry → Token Router → Parser → Integrity → Dispatcher →
Handlers → Token Store → Serializer, errors via the Error Mapper, all parameters in `Config`.
Each stage maps to one spec section (Entrada · Integridad · Comandos · Memoria · Errores).

**Decisions — each lists the alternative discarded and why:**

- **Component pipeline** ⟸ *monolith `switch`*. Each component maps 1:1 to a spec section, so
  spec↔code traceability (which is graded) is mechanical.
- **Deterministic rule engine** ⟸ *LLM in the loop*. The 5 s/step cap plus nondeterminism and cost
  make an LLM unsafe on the hot path; kept only as an optional unknown-command fallback behind a
  flag.
- **In-memory per-token store** ⟸ *database*. `__reset` must be instant and no persistence is
  required.
- **Recon-driven fuzzing, then spec** ⟸ *spec-first*. Behavior is unknown, so the spec must be
  derived from evidence, not assumed.
- **Config-driven parameters** ⟸ *hardcoded constants*. The 15:00 incident changes parameters;
  a re-derivable config survives replay instead of overfitting.

**Phases:** (1) recon / differential fuzz → (2) living spec → (3) mirror server →
(4) regression harness → (5) validate on `/evento` and iterate.
**Anti-overfit:** 70/30 evidence split; no magic constant hardcoded.

---

## 3. Plan to measure

**Metrics** (defined before building):

- `/evento` pass rate — target **100/100**.
- Replay of `ejemplos.jsonl` after `__reset` — **20/20**.
- **p95** latency `< 5 s`/step (hard gate).
- Spec coverage — **100%** of observed commands and errors, each citing a log id.

**Learning loop:** probe original → log to `experimentos.jsonl` → infer rule → encode in config →
validate on `/evento`. Roughly 70% of probes build the rules; ~30% are held out to check they
generalize (no memorized answers).

**Test cases:**

- Replay the 20 examples step-by-step.
- Command × args matrix: happy path, wrong arity (`E302`), bad control format/value
  (`E201`/`E202`), wrong case.
- Memory sequences: `DEPOSITO→CONSULTA`; `TRANSFER` limit (`E506`) and balance (`E507`);
  `ANULA` twice; balance after `ANULA`.
- **Control crack:** sweep candidate values `00..99` per message to recover `f()` (≤10 probe/s).
- Unknown route, `GET /msg`, bad/missing token.
- Differential fuzz: every request to the original is logged to `experimentos.jsonl` with its
  hypothesis and conclusion.

**Gates:** pass rate must be monotonic non-decreasing; the build is blocked until the mirror
matches every **confirmed** behavior; one `experimentos.jsonl` line per probe.
