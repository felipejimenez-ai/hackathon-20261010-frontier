# Especificación del servicio — La caja negra (Reto 2)

Documento para reimplementar el servicio original **sin tocarlo**. Cada comportamiento lleva un ID,
descripción, evidencia (líneas de `experimentos.jsonl`) y confianza:

- **confirmado** — probado y se repite.
- **probable** — visto una vez o inferido.
- **supuesto** — no probado; es el comportamiento por defecto de nuestro reemplazo.

Todos los mensajes viajan en `POST /msg` con cuerpo JSON `{"m": "CMD;arg;...;control"}` y header
`Authorization: Bearer <token>`. El estado es **por token**.

---

## 1. Entrada

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| IN-1 | `GET /health` responde `200` cuando el servicio está listo. | contrato (README) | confirmado |
| IN-2 | `POST /__reset` vuelve el token a su estado inicial. Se llama antes de cada test. | contrato (README) | confirmado |
| IN-3 | El comando principal es `POST /msg` con cuerpo JSON `{"m":"..."}`. | 1–20 | confirmado |
| IN-4 | El mensaje se parte por `;`; el **último** campo es el `control`. | 1–20 | confirmado |
| IN-5 | Todo request lleva `Authorization: Bearer <token>`; el estado es aislado por token. | contrato (README) | confirmado |
| IN-6 | Token ausente o erróneo → `401 {"error":"E001","mensaje":"no autorizado"}`. | sin-token (9000–9012) | confirmado |
| IN-7 | Ruta o método inexistente → `404 {"error":"E404","mensaje":"ruta desconocida"}`; se resuelve **antes** de auth. | sin-token (9003, 9007–9011) | confirmado |
| IN-8 | Límite de infraestructura: 10 req/s y 8000 req/día por token; al exceder responde con header `X-Frontier-Infra: rate-limit` (infra, no servicio). | contrato (README) | confirmado |

## 2. Integridad

El comando `PING` **omite** la validación de integridad. Para el resto:

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| IN-9 | `E104` (segmento vacío) cuando algún campo está vacío (p. ej. `CONSULTA;`). | 5994 | probable |
| IN-10 | `E201` (control mal formado) cuando el `control` no es numérico (p. ej. `5X`). | 17 | confirmado |
| IN-11 | `E202` (control inválido) cuando el control es numérico pero no es el esperado por el checksum. | 2 | confirmado |
| IN-12 | `PING` responde `{"pong":true}` aunque el campo control no sea numérico. | 1, 21 | confirmado |
| IN-13 | El `control` es un entero `0..99` en forma **sin ceros a la izquierda** (`ALTA;Mateo;3` válido, `ALTA;Mateo;03` inválido). | 4 | confirmado |
| IN-14 | El `control` es un checksum determinista del mensaje, **independiente del estado/contador**. | 3, 4 | confirmado |

**Modelo del checksum (propuesto, no cerrado).** El control usa módulo **97** (rango válido observado 3..98), no 100: `control = 98 − r`, con `r = (K + Σ v(charᵢ)·w[distanciaᵢ]) mod 97`, pesos `w_d = −3·10^(d−1) mod 97` (Horner en base 10) y caracteres en mayúsculas. El valor no quedó cerrado (69/87 pares). **Modo *híbrido*: el reemplazo solo aplica `E202` a cuerpos cuyo control se conoce** (tabla medida de 84 cuerpos + modelo `CONSULTA;AC-####`); el resto queda *lenient* (acepta cualquier control numérico), documentado como supuesto S-1.

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| IN-15 | El control es un checksum determinista de módulo 97 del mensaje (Horner base 10). | 1–120 | probable |
| IN-16 | Modo *híbrido*: `E202` solo para cuerpos con control conocido (tabla + modelo CONSULTA); el resto acepta cualquier control numérico. | 1–20, sin-token | confirmado |

## 3. Comandos

Dispatch **insensible a mayúsculas** (`CONSULta` ≡ `CONSULTA`) — evidencia 11.

### `PING`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-1 | Sin estado. Responde `200 {"pong":true}`. Ignora el control. | 1, 11 | confirmado |

### `ALTA;nombre`
Crea cuenta con id incremental por token `AC-####`.
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-2 | `201 {"cuentaId":"AC-0001"}`; los ids son secuenciales desde `AC-0001`. | 3, 4 | confirmado |

### `CONSULTA;cuentaId`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-3 | `200 {"cuenta_id":"AC-0001","saldo":N}` con el saldo actual. | 5, 8, 11, 19 | confirmado |
| CM-4 | Cuenta inexistente → `404 E401`. | 15, 1149 | confirmado |

### `DEPOSITO;cuentaId;monto`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-5 | Acredita el monto y responde `200 {"status":"recieved","operacionId":"OP-0001"}` (typo `recieved` preservada). | 6, 18 | confirmado |
| CM-6 | Cuenta inexistente → `404 E401`. | 1149 | confirmado |

### `TRANSFER;origen;destino;monto`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-7 | Mueve fondos y responde `200 {"status":"recieved","operacionId":"OP-####"}`. | 7, 10 | confirmado |
| CM-8 | `monto > límite` → `422 E506` (límite 100000: 100000 ok, 120000 error). | 9, 10 | probable |
| CM-9 | Saldo insuficiente → `422 E507`. | 16 | confirmado |
| CM-10 | Precedencia: `E506` (límite) se evalúa **antes** que `E507` (saldo). | 9 | confirmado |
| CM-11 | Cuenta (origen o destino) inexistente → `404 E401`. | 1149 | probable |

### `ANULA;operacionId`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-12 | Anula operación → `200 {"ok":true,"anulada":"OP-0003"}`. | 13 | confirmado |
| CM-13 | Idempotente: segunda vez → `200 {"ok":false,"motivo":"ya anulada"}`. | 14 | confirmado |
| CM-14 | Operación inexistente → `404 E402` (operación inexistente). | 1687 | confirmado |
| CM-15 | `ANULA` no restaura saldos (solo marca la operación). | — | supuesto |

## 4. Memoria entre requests

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| ME-1 | El estado es **por token** e independiente entre tokens. | contrato (README) | confirmado |
| ME-2 | Saldos persisten entre requests (`DEPOSITO`→`CONSULTA`). | 5, 6, 8 | confirmado |
| ME-3 | El saldo refleja depósitos y transferencias acumuladas (`250000−40000−100000 = 110000`). | 11 | confirmado |
| ME-4 | Ids incrementales por token: `AC-####` y `OP-####` (contadores separados). | 3–19 | confirmado |
| ME-5 | Conjunto de operaciones anuladas se recuerda (idempotencia de `ANULA`). | 13, 14 | confirmado |
| ME-6 | `POST /__reset` borra todo el estado de ese token. | contrato (README) | confirmado |

## 5. Errores

Cuerpo de error: `{"error":"E###","mensaje":"..."}` con status según la tabla. Orden de evaluación
observado: formato de control (`E201`) → comando desconocido (`E301`) → aridad (`E302`) → integridad
(`E202`) → reglas de negocio (`E401`/`E402`/`E506`/`E507`). `E104` (campo vacío) se observó antes que
`E201`.

| ID | Status | Cuerpo exacto | Evidencia | Confianza |
|----|--------|---------------|-----------|-----------|
| ER-1 | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | 5994 | probable |
| ER-2 | 400 | `{"error":"E201","mensaje":"control mal formado"}` | 17 | confirmado |
| ER-3 | 400 | `{"error":"E202","mensaje":"control inválido"}` | 2 | confirmado |
| ER-4 | 400 | `{"error":"E301","mensaje":"comando desconocido "}` (espacio final incluido) | 12 | confirmado |
| ER-5 | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | 20 | confirmado |
| ER-6 | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | 15, 1149 | confirmado || ER-7 | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | 1687 | confirmado |
| ER-8 | 422 | `{"error":"E506","mensaje":"límite excedido"}` | 9 | confirmado |
| ER-9 | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | 16 | confirmado |
| ER-10 | — | Precedencia: `E506` antes que `E507`; `E301`/`E302` con control válido. | 9, 12, 20 | confirmado |
| ER-11 | 401 | `{"error":"E001","mensaje":"no autorizado"}` (token ausente/erróneo). | sin-token | confirmado |
| ER-12 | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` (ruta/método inexistente; antes de auth). | sin-token | confirmado |

## 6. Cambios durante el día

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CA-1 | Los ejemplos se grabaron con la versión de la mañana; el servicio puede cambiar parámetros durante el día (evento ~15:00). | contrato (README) | confirmado |
| CA-2 | Los parámetros vulnerables (límite de transferencia, prefijos, checksum) se aíslan en `src/config.mjs` para actualizarlos como datos, no como código. | diseño (`docs/design/system-design.md`) | supuesto |
| CA-3 | No se detectó ningún cambio de parámetro durante la recon (todas las mediciones fueron estables). | 1–7896 | probable |
| CA-4 | Incidente v2 (~15:30): el proveedor desplegó la versión 2 con 3 comportamientos cambiados. Auth y rutas se midieron contra el servicio en vivo (v2): `401 E001` y `404 E404`. | sin-token (9000–9012), ticket FR-0153 | confirmado |
| CA-5 | Estrategia de detección: un canario compara el servicio en vivo contra la réplica v1 (validada 20/20) con controles válidos conocidos; cualquier diferencia es candidata a cambio. Pendiente de token para ejecutarlo. | — | supuesto |

## 7. Riesgos

| ID | Comportamiento | Evidencia | Mitigación |
|----|----------------|-----------|------------|
| RI-1 | Checksum no cerrado (modo *lenient*): se aceptan controles inválidos numéricos → se fallan los tests que esperan `E202`. | IN-15/16 | Recuperar la función exacta por análisis offline y activar modo `strict` solo con 100 % de aciertos conocidos. |
| RI-2 | `ANULA` podría revertir saldos en el original; asumimos que no (CM-15). | — | Verificar con una secuencia `TRANSFER;ANULA;CONSULTA`. |
| RI-3 | Token/ruta inexistentes no observados; el reemplazo los trata como normales. | IN-6/IN-7 | Probar con token erróneo y ruta desconocida y copiar la respuesta. |
| RI-4 | Un comando no soportado degradará a *supuesto*. | — | Documentar en esta tabla. |
| RI-5 | Estado multi-instancia divergiría; el set habla a un solo proceso. | contrato (README) | Desplegar una sola instancia. |

---

### Nota de reimplementación
El reemplazo (`src/server.mjs`) implementa esta especificación como una pipeline: Entrada → Token
Router → Parser → Integridad → Dispatcher → Handlers → Token Store → Serializer, con los parámetros
en `src/config.mjs`. Nunca llama al original.
