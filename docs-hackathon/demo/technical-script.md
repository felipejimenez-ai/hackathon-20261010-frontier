# Technical Walkthrough Video — script (for the repo)

**Purpose:** a longer, calmer companion to the 2-minute pitch. Linked from the repo so a judge or another engineer can follow the work without a live demo.
**Length:** ~5 minutes. No dramatic hook — just explain.
**Screen:** VS Code, repo open. No tokens, no `.env`.

---

## Section 1 — Architecture · 0:00–1:00
*Screen: `docs/design/architecture.png`*

> "This is the replica. One process, state kept in memory, isolated per token.
> A request flows through a pipeline: entry, token router, parser, integrity check, dispatcher, command handlers, the per-token store, then the serializer.
> Each stage maps to exactly one section of the spec — entry, integrity, commands, memory, errors — so the code and the spec stay in sync.
> On the right is the original service. It is only used during recon, never at runtime. The replica never calls it."

---

## Section 2 — The specification · 1:00–1:45
*Screen: `docs/spec.md`*

> "The spec is the manual we wrote for a service that had none.
> Seven sections, and every behavior has an ID, a description, the evidence that proves it, and a confidence level.
> Confidence is one of three: confirmed — we tested it and it repeats; probable — seen once or inferred; assumed — not tested, and it's our default.
> We never mix measured facts with assumptions."

---

## Section 3 — The experiment log · 1:45–2:15
*Screen: `experimentos.jsonl`*

> "Every request we sent to the original is one line here: over fifteen thousand of them.
> Each line records the hypothesis we were testing, the request, the status and body we got back, and what we concluded.
> This is the raw evidence the spec cites — nothing in the spec is asserted without a line number pointing to it."

---

## Section 4 — The checksum · 2:15–3:15
*Screen: editor, or a slide with the equation*

> "The hardest part was the last field of every message: a control checksum.
> We first modeled it as modulo 100 and got a fit that was exact for half the cases and off by exactly plus three for the rest.
> That systematic plus three was the clue: a value reduced modulo 97, measured with modulo-100 arithmetic, shifts by exactly three whenever the underlying difference goes negative. One hundred minus ninety-seven is three.
> The real modulus is 97 — ISO 7064, the same scheme the IBAN uses. We compute it with a base-10 Horner fold over the uppercased message, and observed valid controls run from 3 to 98.
> It did not fully close: sixty-nine of eighty-seven pairs, before we hit the daily request limit."

---

## Section 5 — The trade-off · 3:15–4:00
*Screen: `src/config.mjs`*

> "So we made the mode a config value, not a decision baked into code.
> Strict would recompute the checksum and reject a wrong one with E202. Lenient accepts any numeric control.
> We shipped hybrid: strict only where we already know the control, lenient everywhere else.
> The reason is arithmetic. A wrong strict rule rejects valid messages, and inside a sequence one false rejection fails the whole sequence. The break-even is about ninety-five percent accuracy per message, so strict only earns its place above ninety-nine percent. Until then, lenient is safer."

---

## Section 6 — The mid-day change · 4:00–4:30
*Screen: `src/config.mjs` + `docs/spec.md` section 6*

> "Around 3:30 the provider deployed a v2 with different parameters: the transfer limit dropped to fifty thousand, amounts gained validation with error E303, and balances became decimal strings.
> Because every one of those lives in config as data, we adapted by changing values — not by rewriting logic. That was the point of the design: parameters as data survive a change like this."

---

## Section 7 — Close · 4:30–5:00
*Screen: repo root*

> "Deliverables: the repo, the deployed entrypoint, the specification, and the experiment log.
> What we'd do next, given more time and probe budget: close the checksum offline from the requests we already recorded, then flip hybrid to strict — only once it matches a hundred percent of the logged evidence."

---

## Appendix — facts used (all verified against the repo)

| Claim | Source |
|---|---|
| Pipeline: Entry → Token Router → Parser → Integrity → Dispatcher → Handlers → Store → Serializer | `docs/design/system-design.md`, `architecture.png` |
| Spec: 7 sections, columns ID / Behavior / Evidence / Confidence | `docs/spec.md` |
| 15,014 logged requests, 2.93 MB | `experimentos.jsonl` |
| Modulus 97, `100 − 97 = 3`, ISO 7064, controls 3..98 | `docs-hackathon/planning/checksum-findings.md` |
| Fit 69/87, not closed | `docs-hackathon/planning/checksum-findings.md` |
| Hybrid vs strict vs lenient, break-even ~95% | `docs-hackathon/planning/critical-review.md` |
| v2: limit 50000, E303, decimal balance | `src/config.mjs`, `docs/spec.md` §6 |
| Replica never calls the original (else score 0) | challenge README, rules |
