# Rúbrica — Hackathon 2026-10-10

| Peso | Etapa | Cierre | Entregables |
| --- | --- | --- | --- |
| 30% | Systems design | 12:00 | Doc de diseño (1 pág) + diagrama de arquitectura |
| 40% | Ejecución | 20:00 | Repo público, entrypoint, video de 2 min (máx.) y spec + log (Reto 2) |
| 15% | Demo day | Antes del turno | Pitch + material opcional |
| 15% | Profundidad técnica | — | Debrief individual de 10 minutos |

## Systems design (30%) — cierre 12:00

Se alimenta de: **doc de diseño** + **diagrama de arquitectura**.

Escala 1–4 por criterio.

| Criterio | Qué buscamos | Cómo se ve un 1 | Cómo se ve un 4 |
| --- | --- | --- | --- |
| Entendimiento del problema | Qué tiene que resolver el sistema, sus límites y sus supuestos. | Repite el brief sin tomar decisiones. | Nombra supuestos, casos difíciles y lo que deja fuera, con razones. |
| Arquitectura y trade-offs | Componentes claros y decisiones justificadas. | Un diagrama sin decisiones detrás. | Cada decisión dice qué alternativa descartó y por qué. |
| Plan para medir | Cómo van a saber si funciona antes de construir. | No hay forma de medir el resultado. | Casos de prueba y métricas concretas desde el diseño. |

## Ejecución (40%) — cierre 20:00

Se alimenta de: **repo** + **entrypoint** + **video de 2 min** + **spec + log (Reto 2)**.

Escala 1–4 por criterio.

| Criterio | Qué buscamos | Cómo se ve un 1 | Cómo se ve un 4 |
| --- | --- | --- | --- |
| Resultado en el set de evaluaciones oculto | Lo que logra el entrypoint con casos que no conoce (100 tests; pasa con mismo status y mismo cuerpo). Cuenta la corrida final posterior a las 20:00 sobre el último entrypoint entregado a tiempo: menos del 25 % de los casos es 1, de 25 % a 50 % es 2, de 50 % a 75 % es 3, más de 75 % es 4. | El entrypoint no responde o falla casi todo. | Resuelve la mayoría de casos, incluidos los nuevos. |
| Respuesta al incidente | Cómo se adaptan al cambio de ~15:30. El reemplazo se evalúa contra la versión vigente a las 20:00. | El sistema se rompe y no lo detectan. | Detectan el cambio, se adaptan y lo explican. |
| Calidad del repo | Que otra persona lo pueda correr y entender. | No se puede correr. | Corre siguiendo el README y el código se explica solo. |
| Especificación (Reto 2) | Que otro ingeniero pueda reimplementar el servicio con la spec, y que cada comportamiento cite la línea del log que lo prueba. Una afirmación falsa resta. | Describe pocos comportamientos, sin evidencia o con afirmaciones falsas. | Cubre la mayoría de los comportamientos, cada uno con su línea del log, y marca qué es confirmado, qué es probable y qué es supuesto. |

Cada pantalla de entrega enlaza a su etapa aquí.
