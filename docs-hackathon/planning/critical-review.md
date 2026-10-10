# Critical Review — "La caja negra" (Reto 2)

Reviewer notes, pre-20:00. Critical, concrete, prioritized. Decisions, not considerations.

## Verdict

Architecture is fine. Pure-stdlib pipeline with params as data is the right shape.

Three things wrong or missing:
- The checksum is almost certainly **mod 97**, not mod 100.
- Several handlers have invented or unsafe behavior (see Q4).
- You are probing blind on unknowns (ANULA balance effect, error precedence, amount validation) that your own 7900-line log probably already answers. Mine it before spending anything.

## Checksum: likely mod 97 (key insight)

Your "w_d ≈ -3·10^(d-1) mod 97, exact for half, off by +3 for the rest" is a mod-97 signature. 100 − 97 = 3, so differences measured mod 100 on a mod-97 quantity are off by exactly +3 whenever the raw difference was negative. That also explains why your mod-17 value model never closed.

Concretely, `-3 ≡ -(100 mod 97)`. This looks like ISO 7064 MOD 97-10 style: `control = (98 − 100·N) mod 97`, or `(K − 3·N) mod 97`. Here N is a Horner hash with base 10 over the pre-control text, probably including the trailing `;`. The character value is likely raw `ord(c)`; the "signed mod-17" is probably an artifact of the same modulus confusion.

Sample n11 (`CONSULtA` has the same control 14 as `CONSULTA`) says the command is uppercased before hashing. Test whether names are too (`Lucia` vs `LUCIA`) from the log.

**Offline brute force, about 15 minutes of code:**
- Search modulus M ∈ {97, 100, 101}, base B in 0..M−1, multiplier a, offset b.
- Run it over hash text variants: with or without trailing `;`, uppercased or not, ord vs ord−offset.
- Score each candidate against every (body, control) → accept/E202 pair in `experimentos.jsonl`.
- Check one more consequence: if M=97, controls 97, 98, 99 never validate. Look for them in the log.

Artifact that would change the answer: the log reduced to rows of `(message body, control, E202-or-accepted)`. Paste that and the fit can be verified directly.

## Top 5 actions

1. **Mod-97 refit offline** (cost: 30 min, 0 probes). Impact: +5–15 pts. Also unlocks every other probe, because you can compute valid controls instead of brute-forcing 0..99. Gate stays as written: 100% of logged accepts and rejects, plus 20/20 replay.
2. **Mine the existing log** (cost: 30 min, 0 probes). Impact: +5–12 pts. Answer these from data you already have:
   - Does ANULA revert balances? Your handler does not revert; sequences with ANULA then CONSULTA will fail.
   - Can a DEPOSITO be annulled? Does annulling consume an op id?
   - Do failed ops (E401, E506, E507) consume ids? The samples say no.
   - Error precedence: E104 vs E201 vs E202 vs E301 vs E302 vs E401 and E506/E507. Look for logged messages with two faults.
   - What happens on the missing-control / `PING` with no `;` / `PING;x;y` cases?
3. **Fix your own invented behavior** (cost: 30 min, 0 probes). Impact: +2–6 pts.
   - `Number(amountRaw)` gives NaN for "abc". NaN then poisons balances and serializes as `null`. Amounts like `0x10`, `1e3`, `""`, `-5` and `12.5` also pass `Number()`. Your error table has gaps at E501–E505, which are almost certainly amount and validation errors. Find them in the log.
   - Invalid JSON mapped to E302 is invented. Probe it.
   - `raw += c` corrupts multi-byte UTF-8 split across chunks (accented names). Use `req.setEncoding("utf8")`.
   - Any token is accepted. The contract says other or missing tokens must "respond like the original". Read the team token from an env var and never commit it.
4. **Cheap probes from teammate tokens or unauthenticated** (about 30–60 requests total). Impact: +1–4 pts.
   - `GET /nope`, `POST /nope`, `GET /msg`, `POST /msg` with no token, with a bad token, with no body, and with `{}`.
   - Unauthenticated requests probably don't burn token quota. Record exact status, body text and content type.
5. **Canary differential tester** in `tools/`, never imported by `src/`. Impact: protects against the 15:00 change. See scheduling below.

## Q2: run now, or fix first?

**Fix first, timeboxed to about 60–90 minutes.** Do not spend run 1 on a known-broken build.

- The hidden runs are diagnostics only. The post-20:00 organizer run is what counts.
- A baseline with known fixable gaps tells you nothing actionable. Most of the likely score is already predictable (see Q3).
- Exception: if the page returns per-test pass/fail, run 1 is far more valuable. Even then, run it after steps 1–3 so it tests a build worth testing.

## Q3: expected value

Assumptions, from the sample's 1/20 E202 steps (about 5–8% of steps):
- About 15–25% of tests contain a wrong control.
- The failure cascades inside sequences.
- Handler gaps are ignored here.

| Option | 40 singles | 45 seq(2–5) | 15 seq(6–12) | Total |
|---|---|---|---|---|
| **Lenient** | ~35 | ~36 | ~9 | **~78–85** |
| **Strict, 70% per message** | ~29 | ~13 | ~1 | **~40–50** |
| **Strict, 95% per message** | ~38 | ~38 | ~9 | **~80–86** |
| **Strict, 99%+** | ~39 | ~43 | ~13 | **~92–97** |

- Strict at 70% is a disaster, because sequences multiply the per-message error. Never ship it.
- Strict at 95% is only break-even with lenient.
- **Break-even is about 94–96% per message, so only ship strict with a ≥99% proven model.**
- Errors will be correlated by character class, which softens these numbers a little. Keep lenient as the default until the gate passes.

**Safe hybrid even without a perfect model:**
- Enforce strict only when the message body is covered. That means either the model passes the gate on every character in it, or the body is in a table of known-valid `(body → control)` from your log.
- If a known-valid control exists for a body, any other control is E202 with certainty (the control is deterministic). Otherwise stay lenient.
- Caveat: a lookup table looks like overfitting in the debrief, so label it a fallback in the spec.

## Q4: ranked correctness gaps

| Rank | Gap | Impact |
|---|---|---|
| 1 | Checksum E202 | 5–15 pts |
| 2 | ANULA semantics (balance revert, annul a deposit, id consumption) | 3–10 |
| 3 | Amount validation (zero, negative, decimal, leading zeros, huge, non-numeric, E50x) | 3–8 |
| 4 | Error precedence between E104/E201/E202/E301/E302/E401/E506/E507 | 2–6 |
| 5 | Argument case: `ac-0001`; trailing `;`; extra separators; `PING` forms | 1–4 |
| 6 | Same-account transfer, transfer to a missing dst, does the limit apply to DEPOSITO | 1–3 |
| 7 | Unknown routes, wrong or missing token, `POST /__reset` body (returns `{"ok":true}`, which is invented) | 0–3 |
| 8 | Non-ASCII names (UTF-8 bytes vs code points in the checksum) | 0–2 |
| 9 | AC-9999 rollover | ~0 |

## Q5: transfer limit

- Risk is moderate. 100000 is accepted and 120000 is rejected, so the real boundary is anywhere in [100000, 119999].
- It may be `>` 100000 or something else, like 110000.
- It may also be the parameter that changes at 15:00.
- **Pin it cheaply:** bisect 100001..119999, about 14–15 transfers from a teammate token. Valid controls come from the refit model, or brute-force 0..99 per message at about 50 requests expected. Do it in one scripted run.
- Do the same bisect after the 15:00 change. Put the limit in config only, which is already the case.

## Q6 and Q7: run scheduling and the single highest-ROI action

Assumptions:
- Runs reveal only a score (maybe pass/fail).
- The 20:00 state is what counts.
- No run-budget reset to exploit. Ask the organizers once on their channel, but don't plan around it.

| Run | When | Purpose |
|---|---|---|
| **Run 1** | After actions 1–3, **before 15:00** if possible | Validate the fixed build and the harness (`/evento`, 5s per step, cold start). |
| **Run 2** | After 15:00, once the canary shows what changed and you have redeployed | Confirm the new parameter. |
| **Run 3** | About 19:15–19:30 on the final deploy | Smoke test, leaving 30 min to roll back. |

Do **not** burn run 3 right after the change. Keep it for the last deploy.

**Canary:**
- A teammate token replays the 20 samples plus about 100–300 representative requests from the log against the original.
- It diffs against the recorded responses. About 300 requests is far under 8000.
- Run it now (this also tells you whether the incident has already happened), at about 15:30, about 17:00, and about 19:40.
- Anything that diverges is a candidate changed parameter: limit, typo, prefix, checksum constants.

**Single highest-ROI next action:** the mod-97 offline refit, immediately followed by mining the log for ANULA and precedence. It costs 0 probes and unlocks everything else.

## Q8: deliverable gaps

- **Spec:** keep the 7 sections and the 4 columns. "Cambios durante el día" needs the actual incident evidence, with canary log ids. Mark `supuesto` honestly where inferred (limit boundary, unknown routes).
- **Experiment log:** every line needs `hipotesis` and `conclusion` where there was one. Check that no token or `Authorization` header leaked into `experimentos.jsonl` or the repo.
- **Anti-cheat:** the deployed server must never reference the original URL. Keep the canary in `tools/` only, not in the Railway start path. No `ORIGINAL_URL` env var on Railway.
- **Deploy:** listen on `process.env.PORT` and `0.0.0.0`. Make sure the Railway service doesn't sleep and the final deploy is stable. The video should show the entrypoint, not localhost.
- **Debrief readiness:** be able to explain, out loud, why mod 97 and what was discarded.

## Risks ranked by expected score impact

1. Checksum wrong or lenient: 5–15 pts.
2. ANULA semantics unverified: 3–10.
3. Amount validation absent, and NaN corrupting state: 3–8.
4. 15:00 change missed or the final deploy unverified: up to 10+.
5. Error precedence: 2–6.
6. Missing-token, unknown-route and reset-body inventions: 0–3.
7. Platform and ops: UTF-8 chunk bug, cold start, token in repo.

## What I'd do differently

- Treat the modulus as a hypothesis from the first off-by-3 anomaly, instead of building a 20-entry weight table and a mod-17 value model.
- Check the log before probing, and make probes hypothesis-driven.
- Hold the lenient fallback until the model clears the ≥99% gate, then ship the hybrid.
