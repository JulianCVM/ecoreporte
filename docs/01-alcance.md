# 01 · Alcance y delimitación

## Problema

Hay residuos sólidos en la vía pública y el ciudadano no tiene un canal para reportarlos con ubicación, foto y prioridad. La entidad de aseo se entera tarde, sin saber qué tan grave es la situación y sin poder descartar los reportes falsos.

## Origen

Esta app es la implementación móvil del documento de ingeniería **EcoReport AI** (UTS, 2025; Julian fue Product Owner). De ese documento se conservan los actores, los requisitos y los criterios de aceptación. La pila cambia: el documento proponía Spring Boot + PostgreSQL + TensorFlow Lite + WebSocket, y aquí se usan Firebase y Google Cloud (ver [ADR 0002](adr/0002-firebase-gcp-en-lugar-de-la-pila-original.md)). Cada requisito conserva su ID original para poder rastrearlo.

## Actores

| Actor                              | En el documento original                | En esta app                                                                                                                              |
| ---------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **Ciudadano**                      | Operador externo                        | Usuario con sesión. Reporta y sigue sus reportes                                                                                         |
| **IA**                             | Actor sistema que intercepta el reporte | Cloud Function + Gemini (Developer API en desarrollo, Vertex AI en producción, ADR 0007). Clasifica cada foto subida                     |
| **Operador de la entidad de aseo** | Administrador SOC (dashboard web)       | Usuario con el claim `role: "operator"`. En el MVP trabaja **desde la misma app** (bandeja y cambio de estado). El panel web es un extra |
| **Administrador**                  | —                                       | Claim `role: "admin"`. Asigna operadores con un script del Admin SDK. No tiene pantalla                                                  |

## Requisitos funcionales

| ID    | Requisito (adaptado)                                                                                     | Origen                                                                      | Entra en            |
| ----- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------- |
| RF01  | Registrar un reporte con foto de la cámara y ubicación GPS                                               | RF01                                                                        | **MVP**             |
| RF01b | El reporte se puede crear **sin conexión** y se envía solo cuando vuelve la señal                        | Nuevo (realidad de la calle)                                                | **MVP**             |
| RF02  | La IA clasifica cada foto y emite un veredicto: `approved`, `needs_review` o `rejected` (falso positivo) | RF02                                                                        | **MVP**             |
| RF03  | Una situación de complejidad alta genera una alerta inmediata para los operadores                        | RF03 (WebSocket → FCM, [ADR 0006](adr/0006-alertas-con-fcm-y-listeners.md)) | **MVP**             |
| RF04  | Clasificación por tipo: `via_publica`, `domiciliario_ilegal`, `escombros`, `sin_residuo`                 | RF04                                                                        | **MVP**             |
| RF05  | Mapa con los reportes cercanos, filtrable por estado, tipo y complejidad                                 | RF05                                                                        | **MVP** (en la app) |
| RF06  | «Mis reportes»: lista con su estado, que se actualiza en vivo                                            | Nuevo                                                                       | **MVP**             |
| RF07  | El operador cambia el estado: `approved → in_progress → resolved`, y decide los `needs_review`           | Historia del SOC                                                            | **MVP**             |
| RF08  | Notificación push al autor cuando su reporte cambia de estado                                            | Nuevo                                                                       | **MVP**             |
| RF09  | Panel web para la entidad de aseo                                                                        | Dashboard SOC                                                               | Extra               |
| RF10  | Miniatura generada en el servidor para el mapa                                                           | Nuevo                                                                       | Extra               |
| RF11  | Estadísticas por zona y por tipo                                                                         | Nuevo                                                                       | Extra               |

## Requisitos no funcionales

| ID     | Atributo                | Meta en esta app                                                                                                                                                                  | Cómo se verifica                                       |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| RNF01  | Latencia de la IA       | Veredicto en **≤ 3 s p50 y ≤ 8 s p95**, medido dentro de la función (`ai.latencyMs`). El documento pedía < 3 s; con un modelo en la nube el p95 se mide antes de prometerlo       | Consulta sobre `ai.latencyMs` de 30 reportes de prueba |
| RNF01b | Confirmación al usuario | **Inmediata y local**: el reporte aparece en «Mis reportes» como `pending_upload` aunque no haya red                                                                              | Prueba manual en modo avión                            |
| RNF02  | Recuperación            | Firestore y Storage son administrados. Exportación programada de Firestore a un bucket (RPO 24 h). RTO ≤ 4 h (meta del documento) siguiendo el runbook de `04-infraestructura.md` | Una restauración de prueba documentada                 |
| RNF03  | Seguridad en tránsito   | TLS en todo (los SDK de Firebase lo imponen). Reglas cerradas por defecto. App Check                                                                                              | Pruebas de reglas en CI                                |
| RNF04  | Escalabilidad de la IA  | La clasificación corre en una función aparte con `maxInstances` propio, separada del resto                                                                                        | Configuración de la función                            |
| RNF05  | Costo                   | USD 0 en desarrollo (Spark + emuladores, ADR 0007); producción proyectada ≤ USD 5/mes; `AI_DAILY_LIMIT`, tope por usuario e interruptor `AI_ENABLED`                              | Alerta de presupuesto                                  |
| RNF06  | Accesibilidad           | Etiquetas de accesibilidad en los controles; el estado nunca se comunica solo con color                                                                                           | Revisión con TalkBack                                  |

## Criterios de aceptación (del documento, adaptados)

- **IA:** si la confianza es menor que `AI_REVIEW_THRESHOLD` o la categoría es `sin_residuo`, el reporte pasa a `rejected` sin intervención humana. El resultado se guarda en `reports/{id}/evaluations`. Si la complejidad es `alta`, se crea una alerta.
- **Ciudadano:** la ubicación se acepta con una precisión ≤ `LOCATION_MAX_ACCURACY_M` (50 m por defecto; la meta del documento es 10 m y la app la muestra como «precisión buena»). La foto queda ligada a su reporte. El estado se ve en la app en vivo.
- **Operador:** la alerta crítica llega como push. Incluye tipo, coordenadas y miniatura (la miniatura es extra). El operador la marca como atendida desde la app.

## Fuera del alcance

- Publicar en Play Store o App Store (basta el APK de `preview`). iOS se mantiene compatible, pero no se prueba sin iPhone ni cuenta de Apple.
- Entrenar un modelo propio. Se usa un modelo general con un prompt y una salida estructurada; el entrenamiento propio (como el TFLite del documento) queda como trabajo futuro.
- Integración con sistemas reales de una empresa de aseo.
- Moderación de contenido sensible más allá de lo que el modelo marque. Las fotos con personas identificables quedan como **riesgo abierto** en `02-arquitectura.md`.
- Chat, comentarios entre ciudadanos y gamificación.
