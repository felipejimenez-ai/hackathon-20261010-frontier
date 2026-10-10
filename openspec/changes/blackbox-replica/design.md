# Blackbox Replica — Design

## Context

Greenfield replacement of an undocumented 10-year-old HTTP service. Only signal available now is
`pruebas/ejemplos.jsonl` (20 sampled request/response pairs); the full behavior must be recovered
by black-box probing. See `proposal.md` for motivation and `specs/` for requirements.

## Goals / Non-Goals

**Goals:**

- Byte-identical responses (status + body), errors and typos included, per token, reset-safe,
  `≤5 s`/step, never calling the original.

**Non-Goals:**

- Real persistence, header matching, >10 req/s, multi-instance coordination, runtime calls to the
  original (would score 0).

## Decisions

- **Component pipeline** ⟸ *monolith `switch`*. Each stage (Entry, Token Router, Parser, Integrity,
  Dispatcher, Handlers, Store, Serializer) maps to a spec section → mechanical spec↔code
  traceability, which is graded.
- **Deterministic rule engine** ⟸ *LLM in the loop*. 5 s/step cap + nondeterminism + cost; LLM kept
  only as an optional unknown-command fallback behind a flag.
- **In-memory per-token store** ⟸ *database*. `__reset` must be instant and state is ephemeral.
- **Recon-driven fuzzing, then spec** ⟸ *spec-first*. Behavior is unknown; the spec is derived from
  evidence.
- **Config-driven parameters** (limits, checksum params, id prefixes, typo table) ⟸ *hardcoded
  constants*. The 15:00 incident mutates parameters; re-derivable config survives instead of
  overfitting.

## Risks / Trade-offs

- **Unknown `control = f(msg)`** → crack by sweeping candidate values per message and by testing
  state dependence (same message twice after one reset); keep the recovered function in config.
- **Error-precedence ambiguity** → enumerate conflicts (unknown cmd × bad control × arity) and pin
  ordering with targeted probes; encode as an ordered table.
- **Behavior changes at 15:00** → no hardcoded magic values; re-run recon and update config.
- **Overfitting to the 20 samples** → 70/30 evidence split; differential fuzzing against the
  original; every probe logged to `experimentos.jsonl`.
- **Multi-instance state divergence** → single process by contract; state is per-token in memory.

## Migration Plan

1. Recon/fuzz → 2. living spec → 3. mirror server → 4. regression harness → 5. validate on
`/evento` and iterate. Rollback = redeploy previous entrypoint; state is stateless across restarts
(only `__reset`-recoverable state matters).

## Open Questions

- Is `control` stateless or does it fold in a per-token counter? (probe: replay same message.)
- Does `E301` short-circuit before `E201`? (probe: unknown command with malformed control.)
- Does `ANULA` restore balances, or only mark the operation? (probe: transfer, annul, consult.)
