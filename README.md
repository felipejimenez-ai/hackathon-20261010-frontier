# Blackbox Replica — La caja negra (Reto 2)

Reemplazo byte-idéntico de un servicio HTTP sin documentación: mismos status y cuerpos, incluidos
errores y typos. Estado en memoria **por token**. Nunca llama al servicio original.

## Estructura

| Ruta | Qué es |
|------|--------|
| `src/server.mjs` | Servidor HTTP (stdlib, sin dependencias). Pipeline: Entrada → Token Router → Parser → Integridad → Dispatcher → Handlers → Store → Serializer. |
| `src/config.mjs` | Parámetros ajustables (prefijos, límite, contrato de errores, typos, modo de checksum). |
| `tools/recon.mjs` | Harness de recon: `replay`, `probe`, `crack`. |
| `tools/control-dataset.json`, `tools/weights.json`, `tools/char-values.json` | Datos medidos del checksum. |
| `experimentos.jsonl` | Log de experimentos (una línea por request al original). |
| `docs/spec.md` | Especificación del servicio. |
| `docs/design/` | Doc de diseño + diagrama de arquitectura. |
| `openspec/changes/blackbox-replica/` | Especificación viva (proposal, design, tasks, specs). |

## Correr local

```bash
npm start            # escucha en 0.0.0.0:8080 (usa $PORT si existe)
curl http://localhost:8080/health          # -> 200
```

Replay de los 20 ejemplos contra el reemplazo:

```bash
npm test
```

## Contrato del entrypoint

- `GET /health` → `200`.
- `POST /__reset` → estado inicial del token.
- `POST /msg` (y cualquier otra ruta que exista en el original) → misma respuesta.
- Todas las llamadas llevan `Authorization: Bearer <token del equipo>`.

## Desplegar (Railway)

`Procfile` + `railway.json` incluidos; el `startCommand` es `node src/server.mjs`.

```bash
# opción A: desde el repo conectado en railway.app (recomendado)
# opción B: CLI
npm i -g @railway/cli
railway login
railway init
railway up
# configurar la variable PORT si el proveedor no la inyecta (Railway sí la inyecta)
```

El contenedor es stateless; el estado vive en memoria y se resetea con `POST /__reset`.

## Recon (contra el original)

```bash
node tools/recon.mjs replay          # 20/20
node tools/recon.mjs probe "PING;64"
node tools/recon.mjs crack "ALTA;Lucia"   # barrido de control 0..99
```

Requiere `.env` con `CAJA_NEGRA_URL` y `CAJA_NEGRA_TOKEN` (no versionados). Límite: 10 req/s, 8000/día.
