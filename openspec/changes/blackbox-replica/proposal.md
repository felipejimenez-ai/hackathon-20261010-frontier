# Blackbox Replica — Proposal

## Why

A 10-year-old HTTP service with no source, docs, or authors must be replaced without observable
difference. We need a service that reproduces its exact statuses and bodies — errors and typos
included — and a specification other engineers can re-implement from.

## What Changes

- **New**: an HTTP replica service exposing `GET /health`, `POST /__reset`, and any other route
  and method, returning the same status and body as the original.
- **New**: per-token isolated state (accounts, operation ids, annulment set, counters).
- **New**: a deterministically-derived, config-driven behavior core (checksum, limits, id
  prefixes, typos) so parameter changes do not require code changes.
- **New**: a spec (`specs/`) and an experiments log (`experimentos.jsonl`) capturing every
  behavior with evidence and confidence.
- **Not doing**: calling the original at runtime, real persistence, header matching, or
  multi-instance state sharing.

## Capabilities

### New Capabilities

- `message-protocol`: request entry (routes/methods/auth/token routing), message parsing,
  integrity/control validation, command dispatch, and exact response serialization.
- `ledger-state`: per-token in-memory state — accounts, incremental ids, operations,
  annulment/idempotency — plus `POST /__reset` semantics.
- `error-contract`: exact error statuses and bodies (`E2xx`/`E3xx`/`E4xx`/`E5xx`), the order in
  which errors are evaluated, and unknown-route / bad-token fallbacks.

### Modified Capabilities

_None — greenfield replacement._

## Impact

- **Runtime**: one deployable process; stdlib-only HTTP server; in-memory state.
- **External**: original service (`caja-negra-production-*.up.railway.app`) used **only** by the
  offline recon harness, never by the replica.
- **Artifacts**: `docs/design/system-design.md`, `docs/design/architecture.{mmd,png}`,
  `specs/`, `experimentos.jsonl`.
