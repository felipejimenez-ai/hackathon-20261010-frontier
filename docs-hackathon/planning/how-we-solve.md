# How We Solve Challenge 2 — La caja negra (plain-language explainer)

## The challenge in one analogy

Imagine a 10-year-old coffee machine. No manual. Nobody knows what the buttons do. But it still
works, and if you unplug it the whole café shuts down.

You can't open it. But you **can press buttons and watch what happens**. Your job: build a
brand-new machine that behaves *identically* — same outputs for every button, including the weird
broken behaviors.

That's "La caja negra" (the black box). It's an HTTP service; "buttons" are requests, "outputs"
are responses.

## The core insight

We can **ask the original questions** and record answers. It's an oracle. We're not guessing
blindly — we probe it, learn its rules, and encode those rules in our own server.

The trap: if we only learn "PING;64 → pong", we've memorized 20 answers, not understood the
machine. The judges test **100 new sequences we've never seen**. So we must learn the *rules*, not
the answers.

```
   the original service = an oracle
   ┌──────────────┐
   │  ??? rules   │
   └──────┬───────┘
   probe │        │ observed response
   request │      ▼
   ───────┘   {pong:true}   ← we collect (request, response) pairs
                  │
                  ▼
        infer the RULES behind them
                  │
                  ▼
        rebuild rules in OUR service ──▶ must answer identically
```

## How we actually do it — 5 phases

**1. Recon (question the oracle).**
Write a script that fires hundreds of requests: valid ones, broken ones, weird ones. Every request
+ response gets logged. This log is literally a required deliverable (`experimentos.jsonl`).

**2. Crack the hard parts.**
The messages are like `CMD;arg;arg;control`. The `control` last field is a checksum — a number the
service computes to check the message is valid. We don't know the formula. So we brute-force it:
send the same message with control values `00..99`, see which one is accepted. That reveals the
formula.

**3. Write the spec.**
For every behavior we find, we write down: *what it does, the evidence (which log line proved it),
and how sure we are* (confirmed / probable / assumed). This is deliverable #2. It's the "manual"
we're writing for the machine.

**4. Build the mirror server.**
Our own server with the same pipeline: parse message → validate checksum → run the command (create
account, deposit, transfer…) → remember state → respond with exact bytes. Crucially it **never
calls the original** — that's an automatic zero.

**5. Measure and iterate.**
The event has a scoring page (`/evento`) that runs 100 hidden tests against our server and shows how
many pass. We use that as our scoreboard: change something, re-run, keep the number going up.

## Why this design (the choices we made)

- **Rules, not memorized answers** → survives the 100 unseen tests.
- **Everything as data (a "config")** → at 3–4pm the event deliberately *changes a parameter*. If
  our limits/checksum are hardcoded we break; if they're data, we just update them.
- **Component pipeline** (parser / integrity / dispatcher / state) → each piece maps to one section
  of the graded spec, so explaining and building stay in sync.

## How we win points

- **Design (already done):** the doc + diagram.
- **Execution (until 8pm):** working deployed server + spec + experiment log → the 100 tests.
- **Demo:** 2-min video + short pitch.
- **Depth:** a 10-min interview where you explain the above out loud.

The thing they're really testing: can you figure out an unknown system *methodically* and prove it
with evidence.
