# Pitch Script — 2 minutes (slides + one live burst)

**Deliverable:** demo-day pitch, 15% of the score.
**Rubric mapped:** *Clarity* (problem, solution and evidence clear within minutes) + *Evidence* (real results shown working, including what didn't work).
**Format:** hybrid. `slides.html` is the visual spine; one ~25-second live burst proves it actually runs.
**Narrative:** Hook → Problem (villain = the black box) → Solution (hero = the method + replica) → Evidence → Honest gap → Close.
**Audience:** judges **and recruiters.** Plain language. Let the slides carry the technical detail; your voice carries the story.

---

## Before you record (5 min)

1. Open `slides.html` in a browser. Keys: `← →` navigate, `F` fullscreen, `L` toggle EN/ES. Add `?lang=es` for Spanish.
2. Second window: VS Code on `probe.http`, zoomed in (`Ctrl +` a few times).
3. Tabs ready: `architecture.png` is already slide 2; keep `docs/spec.md` in a tab.
4. Run `GET /health` and `POST /__reset` before you start — warms the deploy, begins from zero.
5. Hide `.env`, tokens and notifications. **Never show a token on screen.**
6. Rehearse 3 times with a timer.

---

## The script

### Beat 1 — HOOK + VILLAIN · 0:00–0:20
*Slide 1 (PROBLEM)*

> "Ten years ago, someone built a service a company still runs on.
> The source code is gone. The documentation is gone. The people who wrote it are gone.
> And if it goes down, the company goes down with it.
> We had to understand it — without opening it."

*Delivery: pause after "goes down with it". Let the stakes land.*

---

### Beat 2 — METHOD / HERO · 0:20–0:45
*Slide 2 (METHOD)*

> "So we didn't guess. We asked it.
> We treated the old service like an oracle: we sent it over fifteen thousand requests — normal, broken, strange — and recorded every answer.
> Then we found the rules behind those answers, and rebuilt them in a service of our own.
> It never calls the original."

*Delivery: "we asked it" is the turn. Slight pause before it.*

---

### Beat 3 — EVIDENCE, LIVE · 0:45–1:10
*Switch to VS Code / `probe.http`. Click in this order while talking.*

> "And here it is, running.
> I create an account: `AC-0001`.
> I deposit: it answers *recieved* — with the original's typo.
> I send a command that doesn't exist: error `E301`, with the exact trailing space.
> Same status, same body — byte for byte."

**Click sequence (verified working — see appendix):**

| Click | Request | What appears on screen |
|---|---|---|
| 1 | `ALTA;Lucia;82` | `201 {"cuentaId":"AC-0001"}` |
| 2 | `DEPOSITO;AC-0001;250000;86` | `200 {"status":"recieved","operacionId":"OP-0001"}` |
| 3 | `SALDOS;AC-0001;38` | `400 {"error":"E301","mensaje":"comando desconocido "}` |

*(No transfer in the burst — that keeps it to three clicks. A transfer to `AC-0002` would need `ALTA;Mateo;3` first, or it returns `E401`.)*

*Delivery: narrate the typo and the trailing space — that's the proof of exactness.*

---

### Beat 4 — THE FINDING · 1:10–1:30
*Slide 3 (FINDINGS)*

> "The hardest part was the last number of every message: a checksum.
> We modeled it as modulo 100, and it was off by three in half the cases.
> That plus three was the clue — one hundred minus ninety-seven is three.
> The real modulus was 97 — the same scheme your bank's IBAN uses."

*Delivery: say the equation slowly. This is the "we actually thought about it" moment.*

---

### Beat 5 — WHAT DIDN'T WORK + THE INCIDENT · 1:30–1:50
*Slide 4 (INCIDENT)*

> "We didn't crack it completely: sixty-nine of eighty-seven.
> So we turned it into a setting: validate only where we're sure.
> And when the service changed at 3:30, every parameter lived in config — so we adapted without rewriting code."

*Delivery: calm, factual. A deliberate trade-off, not an apology.*

---

### Beat 6 — RESULTS + CLOSE · 1:50–2:10
*Slide 5 (RESULTS)*

> "Result: seventy-one of a hundred hidden tests — up from 42, to 63, to 71 across three runs.
> We understood a system nobody understood — with method, with evidence, and honest about what's left."

*Delivery: end on the last word. Don't trail off.*

*Tighten: if you run long, cut Beat 5 to one sentence ("We didn't crack it fully, so we made it a setting") and land the result.*

---

## Recruiter lens

Recruiters score the person, not the checksum. Land these, in this order:

- **Storytelling** — villain (the black box), hero (the method). Beats 1–2.
- **Evidence** — you show it running live, not just claim it. Beat 3.
- **Rigor** — the "+3 → modulo 97" reasoning shows how you think. Beat 4.
- **Honesty** — you name the gap and the trade-off yourself. Beat 5. This is rare and memorable.
- **Outcome** — a number that moved 42 → 63 → 71. Beat 6.

What to avoid with a mixed audience: deep internals (Horner fold, per-position weights, error precedence). Say "a checksum" and "a setting", not the mechanics. The slides and the repo hold the depth.

---

## Delivery tips

- **Don't read.** Learn the idea of each beat, not the words.
- **Pause** after the hook and after "plus three". Silence sells.
- **Rehearse the window switch** and the clicks as much as the words.
- **Plan B:** if the network dies, show the appendix table or a pre-recorded clip of the same click sequence, then move on.

---

## Appendix — verified replica responses (2026-10-11)

Captured live against the deployed entrypoint. Use these so the video matches reality.

```
GET  /health                        200  {"ok":true}
POST /__reset                       200  {"ok":true}
ALTA;Lucia;82                       201  {"cuentaId":"AC-0001"}
ALTA;Mateo;3                        201  {"cuentaId":"AC-0002"}
CONSULTA;AC-0001;14                 200  {"cuenta_id":"AC-0001","saldo":"0.00"}
DEPOSITO;AC-0001;250000;86          200  {"status":"recieved","operacionId":"OP-0001"}
CONSULTA;AC-0001;14                 200  {"cuenta_id":"AC-0001","saldo":"2500.00"}
TRANSFER;AC-0001;AC-0002;40000;86   200  {"status":"recieved","operacionId":"OP-0002"}
CONSULTA;AC-0002;11                 200  {"cuenta_id":"AC-0002","saldo":"400.00"}
PING;64                             200  {"pong":true}
TRANSFER;AC-0001;AC-0002;120000;55  422  {"error":"E506","mensaje":"límite excedido"}
TRANSFER;AC-0002;AC-0001;50000;23   422  {"error":"E507","mensaje":"saldo insuficiente"}
DEPOSITO;AC-0001;700;5X             400  {"error":"E201","mensaje":"control mal formado"}
ALTA;Lucia;Gomez;11                 400  {"error":"E302","mensaje":"aridad inválida"}
SALDOS;AC-0001;38                   400  {"error":"E301","mensaje":"comando desconocido "}
CONSULTA;AC-0009;87                 404  {"error":"E401","mensaje":"cuenta inexistente"}
GET  /nope                          404  {"error":"E404","mensaje":"ruta desconocida"}
POST /msg (bad token)               401  {"error":"E001","mensaje":"no autorizado"}
POST /msg (no token)                401  {"error":"E001","mensaje":"no autorizado"}
PING (no control)                   400  {"error":"E103","mensaje":"falta control"}
```

Notes:
- Balance is a **decimal string** (`"2500.00"`), the v2 behavior.
- **Amounts are in cents; balances display in currency units** (`÷100`). So `DEPOSITO;...;250000;86` credits 250,000 cents and `CONSULTA` answers `"2500.00"` — matching the original (log lines 7951, 7953). Say this out loud in the pitch: otherwise `2500.00` after a `250000` deposit reads like a bug.
- `PING;64` works (`200`). Earlier `E302` reports were a shell-quoting artifact, not a service bug.
- `TRANSFER` to a non-existent account returns `404 E401` **before** the limit check — create both accounts first.
- Deck numbers (`71/100`, `42 → 63 → 71`, `35/29/7`, `325 ms`, `29 fails`) are the real `/evento/resultados` values.
