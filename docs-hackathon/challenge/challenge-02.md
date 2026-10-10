## La caja negra

Descubre cómo se comporta un servicio sin documentación y construye un reemplazo que responda exactamente igual.

BRIEF

Heredamos un servicio que lleva 10 años en producción. Nadie sabe qué hace exactamente. No hay código fuente, no hay documentación y las dos personas que lo escribieron ya no están. Sabemos que recibe mensajes y responde, y que si lo apagamos la empresa se cae. Necesitamos entenderlo por completo y construir un reemplazo que se comporte exactamente igual, incluidos sus errores.

RESTRICCIONES

No uses herramientas que hagan el trabajo por ti. Scripts y fuzzers propios sí. El reemplazo no puede llamar al original ni a otro reemplazo. Entregables: el reemplazo desplegado, la especificación y el log de experimentos. El formato de los tres está en el README de tu material.

---

## Entregables

SYSTEMS DESIGNCierre 12:00

—Doc de diseño (una página, pdf o enlace)

—Diagrama de arquitectura (imagen, pdf o enlace)

EJECUCIÓNCierre 20:00

—Repo (url pública)

—Entrypoint (url pública del servicio desplegado, con get /health y el token del equipo)

—Video de 2 minutos (enlace público, máximo 2 minutos)

—Especificación del servicio (solo reto 2)

—Log de experimentos (solo reto 2)

DEMO DAYAntes de tu turno

—Material del pitch (slides, pdf o enlace), opcional

CONTRATO DEL ENTRYPOINTDesplegado por tu equipo, accesible desde internet desde las 20:00 hasta que termine el demo day. Todas las llamadas llevan `Authorization: Bearer <token>`. Desplágalo donde quieras.

`Authorization: Bearer <token>`Todas las llamadas incluyen el token del equipo en este header.

`GET /health`Responde 200 cuando el servicio está listo.

`/* (URL base)`Acepta exactamente los mismos requests que el servicio original, incluidas las rutas que no existen.

`POST /__reset`Vuelve el reemplazo a su estado inicial. Lo llamamos antes de cada test. Con otro token o sin token, responde como el original.

---

## Entorno

Los valores secretos (servicio, token personal, token del equipo) viven en `.env` en la raíz del
repo y están excluidos por `.gitignore`. No los pegues en archivos versionados.

```
CAJA_NEGRA_URL=https://caja-negra-production-c64f.up.railway.app
CAJA_NEGRA_TOKEN=<tu token personal>
ENTRYPOINT_TOKEN=<token del equipo>
```
