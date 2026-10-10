# Checksum findings (offline, no probes)

Data: `tools/valid-pairs.json` = 87 (body, valid control) pairs from `experimentos.jsonl`
(PING and HTTP 429 rows excluded; 429 rows had polluted earlier fits).

## Established
- Modulus is **97**, not 100. Valid controls observed: 3..98 (98 occurs), so `c = 98 - r`, r in 0..96 (ISO 7064 MOD 97-10 range).
- Case-insensitive: args are uppercased before hashing (`c`->`C`, `u`->`U` match).
- Position weights are exact: base 10 Horner, `w_d = -3 * 10^(d-1) mod 97` (d = distance from end).
  This replaces the old mod-100 weight table (the "+3 off" anomaly was mod 100 vs mod 97).
- Model: `h = fold(h*10 + g(ch)) mod 97` over the uppercased body, `control = norm(1 - 3h)`, norm maps 0,1 -> 97,98.
- Letter value (A=1..Z=26) reduced as signed mod 17 (10..16 -> -7..-1); digit value = digit; `;` ~ 31 (fitted).

## Fit quality
- 69/87 pairs with the above (all 'CONSULTA;AAAAA?' sweeps), hill-climb 75/87.
- Misses concentrate on ALTA / DEPOSITO / TRANSFER / ANULA (only 2-5 data points each) and
  `CONSULTA;ZZ`, `CONSULTA;z`, `CONSULTA;XY`.
- NOT closed. Gate (100% accepts + rejects + 20/20) NOT met. Keep LENIENT.

## Needs probes (blocked by 429 on our token; POST /__reset also 429)
- Per-command sweeps for ALTA/DEPOSITO/TRANSFER/ANULA (last-char sweep, 36 probes each) to pin per-command constants.
- Values for lowercase z, X, Y, symbols; confirm whether `;` and `-` have fixed values.
- ~300 probes total is enough now that weights are known.
