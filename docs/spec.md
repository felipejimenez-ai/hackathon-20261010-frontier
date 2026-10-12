# Especificación del servicio — La caja negra (Reto 2)

Documento para reimplementar el servicio original **sin tocarlo**. Cada comportamiento lleva ID,
descripción, evidencia (líneas de `experimentos.jsonl`) y confianza:

- **confirmado** — probado y se repite.
- **probable** — visto una vez o inferido.
- **supuesto** — no probado.

Todos los mensajes viajan en `POST /msg` con `{"m": "CMD;arg;...;control"}` y header
`Authorization: Bearer <token>`. El estado es **por token**. La versión evaluada es **v2** (incidente FR-0153).

---

## 1. Entrada

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| IN-1 | `GET /health` responde `200` sin auth (sonda de readiness). | contrato | confirmado |
| IN-2 | `POST /__reset` vuelve el token a estado inicial; responde `200 {"ok":true}`. | incidente | confirmado |
| IN-3 | Comando principal `POST /msg` con `{"m":"..."}`. | 1–20 | confirmado |
| IN-4 | El mensaje se parte por `;`; el **último** campo es el `control`. | 1–20 | confirmado |
| IN-5 | Todo request lleva `Authorization: Bearer <token>`; estado aislado por token. | contrato | confirmado |
| IN-6 | Token ausente o erróneo → `401 {"error":"E001","mensaje":"no autorizado"}`. | sin-token | confirmado |
| IN-7 | Ruta o método inexistente → `404 {"error":"E404","mensaje":"ruta desconocida"}`, resuelto **antes** de auth. | sin-token | confirmado |
| IN-8 | Límite infra: 10 req/s, 8000 req/día por token; al exceder, header `X-Frontier-Infra: rate-limit`. | contrato | confirmado |
| IN-17 | El `control` tiene **1–2 dígitos** (`100` → `E201`), sin ceros a la izquierda; válidos 3..98. | incidente:probe2 | confirmado |
| IN-18 | Cuerpo de `POST /msg`: JSON inválido o vacío → `E100`; JSON válido sin `m` string → `E102`. | incidente:probe2 | confirmado |

## 2. Integridad

`PING` **omite** la validación de integridad (pero exige el `;` y la aridad). Para el resto:

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| IN-9 | `E104` (segmento vacío) si algún campo está vacío (`CONSULTA;;0`). | 5994, incidente:explorar | confirmado |
| IN-10 | `E201` (control mal formado) si el control no es numérico o tiene ≥3 dígitos (`5X`, `100`). | 17, incidente:probe2 | confirmado |
| IN-11 | `E202` (control inválido) si el control es numérico pero no es el esperado. | 2 | confirmado |
| IN-12 | `PING` responde `{"pong":true}` aunque el control no sea numérico. | 1, 21 | confirmado |
| IN-13 | Control entero 0..99, sin ceros a la izquierda (`ALTA;Mateo;3` válido, `ALTA;Mateo;03` inválido). | 4 | confirmado |
| IN-14 | El control es un checksum determinista e **independiente del estado**. | 3, 4 | confirmado |
| IN-19 | El control (E201/E202) se evalúa **antes** que comando (E301) y aridad (E302). | incidente:explorar | confirmado |

**Modelo del checksum (mod 97, NO cerrado).**
`control = 98 − r`; pesos de posición confirmados como `w = 10^(nº de caracteres no separadores después)`
(verificado con deltas `A→B` en `AAA;AAA`: posiciones dan `3·10^k mod 97`). El **cuerpo se pasa a mayúsculas
por completo**: medido que `CONSULTA;A` = `CONSULTA;a` (mismo control), `;`/`-` no cuentan como posición.
`CONSULTA;AC-####` se predice bien en todas las posiciones de dígito.
Sin embargo, un modelo lineal de valores por carácter **falla para cuerpos con letras repetidas o de varias
letras** (`CONSULTA;J`=98 pero `CONSULTA;JJ`=68, `CONSULTA;AJ`=68): la combinación no es lineal, así que
**no se cerró** la fórmula completa. El reemplazo usa modo **híbrido**.

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| IN-15 | Checksum determinista de módulo 97; pesos `10^(no-sep-after)`; cuerpo a mayúsculas (args incluidos); `;`/`-` no aportan posición. | sweep-case, probe-weights, probe-combo | confirmado |
| IN-16 | Modo *híbrido*: `E202` solo para cuerpos con control conocido (tabla medida + modelo `CONSULTA;AC-####`, validado en todas las posiciones de dígito); el resto *lenient*. | 1–20, incidente:probe2 | confirmado |
| IN-17 | La combinación de caracteres **no es lineal**: `A→B` en una posición cambia el control en `3·10^k`, pero cuerpos con un carácter repetido no siguen ese modelo. Fórmula completa no cerrada. | probe-weights, probe-runs | probable |

## 3. Comandos

Dispatch **insensible a mayúsculas** en el nombre del comando (`CONSULta` ≡ `CONSULTA`). Los ids de
cuenta/operación son sensibles a mayúscula en la búsqueda (`ac-0001` ≠ `AC-0001`).

> **Unidades (v2):** los `monto` de `DEPOSITO`/`TRANSFER` están en **centavos**, y el saldo se
> **muestra** en unidades de moneda (`centavos/100`). Ej.: `DEPOSITO;AC-0001;250000;86` acredita
> 250000 centavos y `CONSULTA` responde `"2500.00"`. Reformatos puros: `40000`→`"400.00"`,
> `40700`→`"407.00"`, `0`→`"0.00"` (evidencia 7915, 7918, 7929, 7951, 7953).

### `PING`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-1 | Aridad 0; ignora el control; exige `;` (si no → `E103`). `200 {"pong":true}`. | 1, incidente:explorar | confirmado |

### `ALTA;nombre`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-2 | `201 {"cuentaId":"AC-0001"}`; ids secuenciales por token. | 3, 4 | confirmado |
| CM-17 | Nombres duplicados crean cuentas nuevas. | incidente:explorar | confirmado |

### `CONSULTA;cuentaId`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-3 | `200 {"cuenta_id":"AC-0001","saldo":"N.DD"}`. **v2:** el saldo es un **string** en unidades (`centavos/100`). | 5, 8, 11, 19 | confirmado |
| CM-4 | Cuenta inexistente → `404 E401`. | 15 | confirmado |

### `DEPOSITO;cuentaId;monto`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-5 | `200 {"status":"recieved","operacionId":"OP-0001"}` (typo `recieved` preservada). | 6, 18 | confirmado |
| CM-6 | Cuenta inexistente → `404 E401`. | incidente:probe2 | confirmado |

### `TRANSFER;origen;destino;monto`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-7 | `200 {"status":"recieved","operacionId":"OP-####"}`. | 7, 10 | confirmado |
| CM-8 | `monto > límite` → `422 E506`. **v2:** límite = **50000**, independiente del saldo. | incidente:limite | confirmado |
| CM-9 | Saldo insuficiente → `422 E507`. | 16 | confirmado |
| CM-10 | **Orden v2:** `E303` (monto) → `E304` (misma cuenta) → `E401` (cuentas) → `E506` (límite) → `E507` (saldo). | incidente:probe3/4 | confirmado |
| CM-11 | Cuenta inexistente → `404 E401`. | incidente:probe4 | confirmado |
| CM-18 | Origen = destino → `400 E304` ("origen y destino iguales"). | incidente:probe3 | confirmado |

### `ANULA;operacionId`
| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CM-12 | `200 {"ok":true,"anulada":"OP-0003"}`. | 13 | confirmado |
| CM-13 | Idempotente: repetir → `200 {"ok":false,"motivo":"ya anulada"}`. | 14 | confirmado |
| CM-14 | Operación inexistente → `404 E402`. | 1687 | confirmado |
| CM-15 | **v2:** `ANULA` **revierte** los saldos (transfer anulado restaura ambos; depósito anulado lo resta). Puede dejar saldo negativo (visto `"-5.00"`). | incidente:anula, probe3 | confirmado |

## 4. Memoria entre requests

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| ME-1 | Estado por token, independiente entre tokens. | contrato | confirmado |
| ME-2 | Saldos persisten entre requests. | 5, 6, 8 | confirmado |
| ME-3 | El saldo refleja depósitos y transferencias acumuladas. | 11 | confirmado |
| ME-4 | Ids incrementales por token: `AC-####` y `OP-####` (contadores separados). | 3–19 | confirmado |
| ME-5 | Conjunto de operaciones anuladas se recuerda (idempotencia). | 13, 14 | confirmado |
| ME-6 | `POST /__reset` borra todo el estado del token. | contrato | confirmado |
| ME-7 | Las operaciones fallidas NO consumen id de operación. | 18 (id 1687), incidente | confirmado |

## 5. Errores

Cuerpo: `{"error":"E###","mensaje":"..."}`. `E104` (campo vacío) antes de `E201`/`E202`; control antes de comando/aridad.

| ID | Status | Cuerpo exacto | Evidencia | Confianza |
|----|--------|---------------|-----------|-----------|
| ER-1 | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | 5994 | confirmado |
| ER-2 | 400 | `{"error":"E201","mensaje":"control mal formado"}` | 17 | confirmado |
| ER-3 | 400 | `{"error":"E202","mensaje":"control inválido"}` | 2 | confirmado |
| ER-4 | 400 | `{"error":"E301","mensaje":"comando desconocido "}` (espacio final) | 12 | confirmado |
| ER-5 | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | 20 | confirmado |
| ER-6 | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | 15 | confirmado |
| ER-7 | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | 1687 | confirmado |
| ER-8 | 422 | `{"error":"E506","mensaje":"límite excedido"}` | 9 | confirmado |
| ER-9 | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | 16 | confirmado |
| ER-11 | 401 | `{"error":"E001","mensaje":"no autorizado"}` | sin-token | confirmado |
| ER-12 | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | sin-token | confirmado |
| ER-16 | 400 | `{"error":"E100","mensaje":"json inválido"}` | incidente:probe2 | confirmado |
| ER-17 | 400 | `{"error":"E102","mensaje":"falta m"}` | incidente:probe2 | confirmado |
| ER-13 | 400 | `{"error":"E103","mensaje":"falta control"}` | incidente:probe2 | confirmado |
| ER-14 | 400 | `{"error":"E303","mensaje":"monto inválido"}` | incidente:explorar | confirmado |
| ER-18 | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` | incidente:probe3 | confirmado |

**Validación de monto (E303):** entero positivo sin ceros a la izquierda, ≤ 9999999999. Inválidos: `0`, `000700`,
`12.5`, `-5`, `abc`, ` 700`, `+700`. Se evalúa antes de la cuenta.

## 6. Cambios durante el día (incidente v2)

| ID | Comportamiento | Evidencia | Confianza |
|----|----------------|-----------|-----------|
| CA-1 | El proveedor desplegó v2 (~15:30) cambiando 3 comportamientos. | ticket FR-0153 | confirmado |
| CA-5 | Estrategia: testing diferencial contra el oráculo (los 20 ejemplos + el log + la réplica validada 20/20); cualquier diferencia es un cambio. Herramienta `tools/incident.mjs`. | incidente:muestras | confirmado |
| CA-6 | **Cambio #1:** el saldo se expone como string decimal en unidades (`"2100.00"`), no entero. | incidente:muestras | confirmado |
| CA-7 | **Cambio #2:** el límite de transferencia pasó de 100000 a **50000**. | incidente:limite | confirmado |
| CA-8 | **Cambio #3:** validación de monto con `E303` antes de la cuenta; además `E103`, `E304`, `E100`, `E102`, y control antes de comando/aridad. | incidente:probe2/3/4 | confirmado |
| CA-2 | Los parámetros (límite, prefijos, máx. monto, divisa, errores) se aíslan en `src/config.mjs` para actualizarlos como datos. | diseño | confirmado |

## 7. Riesgos

| ID | Riesgo | Evidencia | Mitigación |
|----|--------|-----------|------------|
| RI-1 | Checksum *lenient* en cuerpos no medidos: un control inválido en un cuerpo desconocido se acepta. Es la mayor brecha estructural. | IN-16 | Cerrar los valores de letras por un sistema lineal mod 97 (casi resuelto) y validar con holdouts antes de forzar. |
| RI-2 | Semántica de secuencias con `ANULA` (saldos negativos) poco medida. | CM-15 | Fuzz diferencial de secuencias contra el original. |
| RI-3 | Especificidades de `ALTA` (nombres con espacios, largos, unicode) no medidas. | — | Ampliar tabla de cuerpos conocidos. |
| RI-4 | Límite exacto del monto (9999999999) no pinneado. | CM-16 | Sondear 10000000000. |
| RI-5 | Estado multi-instancia divergiría; el set habla a un solo proceso. | contrato | Desplegar una sola instancia. |

---

### Nota de reimplementación
El reemplazo (`src/server.mjs`) implementa esta especificación como una pipeline: Entrada → Token Router →
Parser → Integridad → Dispatcher → Handlers → Store → Serializer, con parámetros en `src/config.mjs`.
Nunca llama al original.

## 8. Cómo aprende el sistema (método)

- **Aprender patrones (la regla):** observar pares (entrada→salida) → hipótesis → medir aislando una variable →
  ajustar parámetros → verificar contra **todos** los aciertos/rechazos conocidos → codificar. Ej.: el `+3` al medir
  mod 100 sobre una magnitud mod 97 reveló el módulo correcto.
- **Aprender comportamientos (el cambio):** testing diferencial contra el oráculo v1 (validado 20/20); cada
  diferencia es un cambio candidato.

Cada aprendizaje vive en: **un valor** (`config.mjs`), **una regla** (módulo/handler) o **una tabla medida**
(`known-controls.mjs`, cuando la regla no cerró). Garantías: parámetros como datos, niveles de confianza,
y un *gate* (`tools/gate.mjs`) que re-verifica todo lo conocido para no romper lo anterior.
