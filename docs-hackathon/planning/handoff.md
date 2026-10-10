Hackathon handoff — 2026-10-10
Contexto
- Hackathon, reto elegido: Reto 2 · La caja negra.
- Ruta: C:\Users\USUARIO\my-code\hackathon-20261010.
- Material en docs-hackathon/challenge/: challenge-02.md, rubric.md, frontier-reto-2/README.md + pruebas/ejemplos.jsonl.
- Docs propios en docs-hackathon/planning/: handoff.md (este), how-we-solve.md.
- Design 12:00 en docs/design/: system-design.md, architecture.mmd + architecture.png.
- Especificación viva del reto: openspec/changes/blackbox-replica/.
- API: OpenRouter (key en .env → open_router_api_key). Dev agent: opencode.
Rúbrica (evaluación)
- 30% Systems design — cierre 12:00. Doc diseño (1 pág) + diagrama arquitectura.
- 40% Ejecución — cierre 20:00. Repo público, entrypoint desplegado, video 2 min + spec + log experimentos.
- 15% Demo day — pitch (slides opcional).
- 15% Profundidad técnica — debrief individual 10 min.
- Criterios diseño: entendimiento problema, arquitectura/trade-offs (qué alternativa descartaste y por qué), plan para medir (métricas concretas desde diseño).
Decisión dev tooling
- Hackathon da acceso a pi agent (harness minimal) + OpenRouter API.
- Decidido: seguir con opencode. Mismos créditos OpenRouter sirven en ambos, sin ganancia al cambiar. opencode ya configurado (plan mode, sub-agentes, skills). pi solo como backup opcional.
Reto 2 — detalle
Servicio 10 años en prod, sin docs. Recibe HTTP, responde. Construir reemplazo idéntico, errores incluidos.
- URL original: https://caja-negra-production-c64f.up.railway.app
- Endpoints: POST /msg body {"m": "PING;64"}; POST /__reset; GET /health.
- Token por persona (header Authorization: Bearer <token>). Cada token estado separado.
- pruebas/ejemplos.jsonl: 20 requests+respuestas, una secuencia, grabados versión mañana. Reproducir = POST /__reset + mandar en orden.
Contrato reemplazo
- GET /health → 200.
- POST /__reset → estado inicial.
- Cualquier otra ruta responde igual que original, incluidas rutas inexistentes.
- Token errado/ausente → responde como original.
- No puede llamar original ni otro reemplazo (si lo hace, set = 0).
- LLM interno OK si responde en <5s por paso.
- Set habla a un solo proceso (evalúa estado por instancia).
Evaluación
- 100 tests en /evento; resultados en /evento/resultados.
- 40 de 1 request, 45 secuencias 2-5 req, 15 secuencias 6-12 req.
- Cada test arranca con POST /__reset. Ningún test repite ejemplos.jsonl.
- Pass si mismo status + mismo body. JSON: claves cualquier orden, arrays en orden, strings/números idénticos. No-JSON: texto exacto. Headers no se comparan. 5s/paso.
- Corre final post-20:00 sobre último entrypoint entregado a tiempo.
Entregables extra
- Spec: cada comportamiento con ID | Comportamiento | Evidencia (ids del log) | Confianza (confirmado/probable/supuesto). Secciones: Entrada, Integridad, Comandos, Memoria entre requests, Errores, Cambios durante el día, Riesgos.
- experimentos.jsonl: 1 línea JSON/request al original: {id, seq, x_req, hipotesis, request, status, response, conclusion?}. x_req = header X-Req de respuesta.
Límites infra
- 10 req/s por token, 8000/día. Excedido → header X-Frontier-Infra: rate-limit (respuesta infra, no servicio).
- Servicio puede cambiar durante día; eval contra versión vigente 20:00.
- 20:00 tokens dejan de funcionar contra original.
Notas evento
- Incidente 3-4pm: el problema cambia a algo más general. Reto 2 → "cambia parámetros". Reto 1 → clínica se vuelve supermercado (contexto). Diseñar para generalizar, no overfit.
- 70% entrenamiento / 30% tests — cuidado overfitting.
- WiFi: WynwoodH.
- Equipo posible si varios eligen mismo reto.
Estado y siguiente paso
- Systems design (12:00): ENTREGADO — docs/design/system-design.md + architecture.png. Especificado en openspec/changes/blackbox-replica/.
- Ejecución (20:00) pendiente. Orden: recon/fuzzing → spec → servidor espejo → harness diferencial → validar en /evento.
- Estrategia anti-incidente: params (control/límites/prefijos) como config, nunca hardcode.
Preguntas abiertas
- Recon del servicio real: NO hecho aún (mandar requests propios, ver /msg real). Primer paso de build.
- Infra de despliegue elegida (Railway) — por confirmar.
- Algoritmo del campo `control` (checksum) sin descifrar — crack por barrido 00..99.
