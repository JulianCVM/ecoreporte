# Documentación de EcoReporte

| Documento                                     | Qué responde                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| [01 · Alcance](01-alcance.md)                 | Qué problema resuelve, para quién, qué entra en el MVP y qué no                    |
| [02 · Arquitectura](02-arquitectura.md)       | Componentes, flujo de un reporte, estados, estructura del código, riesgos          |
| [03 · Modelo de datos](03-modelo-de-datos.md) | Colecciones, campos, índices, rutas de Storage y quién puede qué                   |
| [04 · Infraestructura](04-infraestructura.md) | Proyectos, recursos, IAM, secretos, CI/CD, costos, recuperación y puesta en marcha |
| [05 · Parametrización](05-parametrizacion.md) | Cada valor configurable: dónde vive, por defecto, rango y efecto                   |
| [06 · Demostración](06-demo.md)               | Cómo mostrar la app de punta a punta con los emuladores y datos sembrados          |
| [ADR](adr/)                                   | Las decisiones y su porqué                                                         |

## Plan de trabajo (2026-11-18 → 2026-12-07)

El seguimiento vive en el [Project de GitHub](https://github.com/users/JulianCVM/projects/11): una issue por entregable y un milestone por bloque.

| Bloque                              | Fechas    | Entregable                                                                                                                                | Issues  | Estado |
| ----------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ |
| 0 · Base                            | 18 nov    | Proyecto Expo SDK 58, estructura, dominio con pruebas, documentación, CI, repositorio público                                             | —       | ✅     |
| 0b · Firebase nativo y primer build | 19–20 nov | Flujo `dev`/`main` y tablero; React Native Firebase con `ecoreporte-dev` (Spark); conexión a emuladores; primer development build         | #1–#4   | 🟡     |
| 1 · Crear reportes                  | 20–24 nov | Base de `functions/`; inicio de sesión; pruebas de reglas; cámara, ubicación y compresión; reporte sin conexión y cola de subida          | #5–#10  | ⬜     |
| 2 · IA                              | 25–30 nov | `Classifier` (mock y Gemini gratis); `classifyReportPhoto`, `decideVerdict` y `evaluations`; topes; «Mis reportes» en vivo; push al autor | #11–#15 | ⬜     |
| 3 · Mapa y operador                 | 1–4 dic   | Mapa con MapLibre; operador con claims; alertas FCM; App Check, Crashlytics, Analytics y Remote Config; accesibilidad                     | #16–#20 | ⬜     |
| 4 · Cierre                          | 5–7 dic   | Producción proyectada (sin activar); APK `preview` en Releases; medición de latencia; README con capturas y video; `v1.0.0`               | #21–#25 | ⬜     |

**Terminada** quiere decir que cumple el estándar común de la ruta (repositorio público, pruebas, CI, APK, README, video, sin secretos).
