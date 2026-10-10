# Making Requests — HTTP Primer

How we talk to the black box (and later to our replica). Yes — it's an API, specifically an
**HTTP API**. Same thing a browser does when it loads a page, just with different "verbs" and a
JSON body.

## What a request is made of

Every request has 4 parts:

```
① Method + URL   POST https://caja-negra-.../msg
② Headers        Authorization: Bearer <TOKEN>
                 Content-Type: application/json
③ Body (json)    {"m": "PING;64"}
④ → Response     status 200  +  body {"pong":true}
```

The black box gives us **3 endpoints**:

| Endpoint | What it's for |
|---|---|
| `POST /msg` | send a command message (the main one) |
| `POST /__reset` | wipe state back to zero |
| `GET /health` | is it alive? returns 200 |

## How you actually send one

Pick any tool. All equivalent.

**curl** (simplest, works everywhere):
```bash
curl -X POST https://caja-negra-production-c64f.up.railway.app/msg \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"m\":\"PING;64\"}"
```

**PowerShell** (native on Windows):
```powershell
Invoke-RestMethod -Method Post `
  -Uri "https://caja-negra-production-c64f.up.railway.app/msg" `
  -Headers @{ Authorization = "Bearer <TOKEN>" } `
  -ContentType "application/json" `
  -Body '{"m":"PING;64"}'
```

**Node / fetch** (what the recon script will use):
```js
await fetch("https://caja-negra-production-c64f.up.railway.app/msg", {
  method: "POST",
  headers: { "Authorization": "Bearer <TOKEN>", "Content-Type": "application/json" },
  body: JSON.stringify({ m: "PING;64" })
});
```

Replace `<TOKEN>` with the real token (yours is in `docs/rubrica.md`).

## Three things that confuse beginners

1. **State lives on the server, per token.** Send `ALTA` then `CONSULTA` — the second remembers
   the first. That's why we `POST /__reset` before every test sequence, so each test starts clean.
2. **The command is just text inside JSON.** `{"m": "ALTA;Lucia;82"}` — the server splits on `;`.
   It's not separate API parameters; it's one string the service parses.
3. **A "sequence" = multiple requests, in order.** e.g. reset → ALTA → DEPOSITO → CONSULTA. Each
   depends on the previous.

## For our job

We write one **script** (task 1.1) that fires these requests in a loop and records every
`(request → response)` pair into `experimentos.jsonl`. That script is our "training" tool — it
asks the oracle hundreds of questions automatically instead of by hand.

The same script, pointed at **our** replica URL instead of the original, becomes our test harness
(does our server answer the same?).
