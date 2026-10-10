# Architecture Walkthrough — Black Box Replica

A plain-language tour of `docs/design/architecture.png` for newcomers.

## The big picture

- **Left 90% (yellow box)** = *our* service. One process, keeps state in memory, split per token.
- **Right side** = the original service + the recon tool that studies it. The original is
  **disconnected** from our runtime flow — it is only used during "training" (recon), never at
  runtime. Calling it from the replica scores 0.

## Follow one request (solid arrows = live traffic)

1. **Client → HTTP Entry** (`Authorization: Bearer <token>`).
   The entry point is the front door. It accepts *any* route and *any* method.

2. **HTTP Entry splits 3 ways:**
   - `/health` → reply `200` (liveness check).
   - `/__reset` → wipe state to zero.
   - **any other route** → send down the main line (this is `POST /msg`).

3. **Token Router** — checks the token.
   - valid team token → continue.
   - bad/missing token → jump to **"Mimic original response"** (reproduce whatever the original
     does for a bad token).

4. **Parser** — `m = split on ";"`. Turns `"ALTA;Lucia;82"` into `[ALTA, Lucia, 82]`.

5. **Integrity check** — computes `control = f(msg)` and compares it to the last field.
   - fails → **Error mapper** → `E201` (malformed) or `E202` (wrong value).
   - ok → continue.

6. **Dispatcher** — does the command exist? does it have the right number of arguments?
   - unknown command → `E301`; wrong arity → `E302` → **Error mapper**.
   - ok → continue.

7. **Command handlers** — actually run it (`PING`, `ALTA`, `CONSULTA`, `DEPOSITO`, `TRANSFER`,
   `ANULA`). This is where the logic lives.

8. **Token Store** (the cylinder = a database-like box) — reads/writes *this token's* state:
   balances, `AC-/OP-` ids, annulled operations, counters. This is the "memory between requests".

9. **Serializer** — builds the **exact** response bytes, typos included (`"recieved"`).

10. **status + body → Client.** Done.

## The two side systems

- **Error mapper** (`E2xx/E3xx/E4xx/E5xx precedence`) = a central place all errors funnel into.
  **Precedence** matters: when two things are wrong at once, it decides *which* error wins. We
  reverse-engineer that order.
- **Mimic original response** = fallback for token/route cases; we copy the original's behavior
  byte-for-byte.

## Right side + dashed lines (data, not requests)

- **Original service → Recon / differential fuzz harness**: during "training" we hammer the
  original and record answers.
- **Recon → Config**: the harness **derives** the tunable values.
- **Config → (dashed) Integrity, Handlers, Serializer**: the config feeds the knobs (limits,
  checksum params, id prefixes, typo table). This is the **anti-incident** design — when the
  3–4pm change flips a parameter, we update *data*, not code.

## Legend

- **Solid arrows** = a request flowing at runtime.
- **Dashed arrows** = a value/relationship (config feeding a component, or recon producing
  config) — not a request.

## One-line summary

**Front door → check token → parse → verify checksum → resolve command → run it against
per-token memory → serialize the exact reply**, with errors peeled off to a central mapper and all
magic values coming from re-derivable `Config`.
