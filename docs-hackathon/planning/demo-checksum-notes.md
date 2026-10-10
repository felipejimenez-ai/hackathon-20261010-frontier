# Checksum blocker — decisions & demo notes (2026-10-10)

## Status
- Time documented: ~1:30pm. Deadline 20:00.
- Solo, no probe budget left (token 8,000/day exhausted). 7,896 requests logged in experimentos.jsonl.

## What the checksum is (plain)
Every message ends in a number that acts like a wax seal. The real service checks it.
- Not a number -> error E201 ("control mal formado").
- Valid seal -> command runs.
- Wrong number -> error E202 ("control inválido").

## What we found
- The seal is additive and weighted by character position (distance to the end).
- Confirmed additive structure: control = (K + Sum v(char)*w[dist]) mod 100.
- Unresolved: an extra position-dependent factor ("position-mixed alphabet").
  Measured lowercase values don't follow the uppercase rule (e.g. v(l)=-8 vs v(L)=-6).
- Could not pin the closed form before probe budget ran out.

## Decision
Ship "lenient" mode now; crack offline as bonus. Do NOT block on checksum.
- lenient = accept ANY numeric seal, don't verify. (Currently live: server.mjs:98, config.mjs:16)
- strict = recompute seal, reject wrong with E202. NOT shipped unless provably perfect.

## Why lenient (the trade-off)
- lenient never rejects a valid message -> passes every test whose seal is valid.
- Wrong strict rule rejects valid messages -> cascades -> scores WORSE than lenient.
- Mid-day param change risk: a cracked rule is fragile; lenient survives it.
- Known cost: tests expecting E202 fail (bounded, est. ~10-25 of 100).

## Hard gate to ever switch to strict
Model must reproduce 100% of logged evidence:
- ALTA;Lucia;82 = accept vs ALTA;Lucia;83 = E202
- 20/20 examples
- all ~80 control-dataset prefixes
Else: stay lenient, mark checksum as "supuesto" in the spec.

## Demo talking points (30s, deliberate trade-off not a failure)
1. Found: seal = additive, position-weighted. Extra position-mixed factor unresolved.
2. Constraint: probes rate-limited (8,000/day/token); exhausted.
3. Decision: config switch; deployed = lenient (accept any numeric seal).
4. Why not guess: wrong rule rejects valid traffic and cascades.
5. Upside: everything else exact; keep cracking offline from 7,896 logged requests, zero budget.

## Paste-ready demo script (~30s)
> "One field resisted us: the final number — a checksum. We proved it's additive and
> position-weighted, but a position-mixed factor stayed unresolved before we hit the daily
> probe limit. Rather than hardcode a guess, we made it a config switch. The deployed version
> is lenient: it accepts any numeric checksum, so it never rejects a valid message. That's a
> deliberate choice — a wrong checksum formula would reject legitimate requests and cascade
> failures, which is worse. So strict validation only ships when it matches 100% of our logged
> evidence. Meanwhile we keep solving it offline from the 7,896 requests we already recorded —
> no extra budget needed."

## If asked about the gap
> "We accept that checksum-rejection tests may fail; we traded a small, bounded loss for zero
> risk of rejecting valid traffic."
