# Documentación de EcoReporte

| Documento                                     | Qué responde                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------------------------- |
| [01 · Alcance](01-alcance.md)                 | Qué problema resuelve, para quién, qué entra en el MVP y qué no                    |
| [02 · Arquitectura](02-arquitectura.md)       | Componentes, flujo de un reporte, estados, estructura del código, riesgos          |
| [03 · Modelo de datos](03-modelo-de-datos.md) | Colecciones, campos, índices, rutas de Storage y quién puede qué                   |
| [04 · Infraestructura](04-infraestructura.md) | Proyectos, recursos, IAM, secretos, CI/CD, costos, recuperación y puesta en marcha |
| [05 · Parametrización](05-parametrizacion.md) | Cada valor configurable: dónde vive, por defecto, rango y efecto                   |
| [ADR](adr/)                                   | Las decisiones y su porqué                                                         |

## Plan de trabajo (2026-11-18 → 2026-12-07)

| Bloque                   | Fechas    | Entregable                                                                                                             | Estado |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------------- | ------ |
| 0 · Base                 | 18 nov    | Proyecto Expo SDK 58, estructura, dominio con pruebas, documentación, CI                                               | ✅     |
| 0b · Nube y primer build | 19 nov    | `ecoreporte-dev` en Blaze con presupuesto; React Native Firebase; primer development build en el emulador              | ⬜     |
| 1 · Crear reportes       | 20–24 nov | Inicio de sesión; emuladores; pruebas de reglas; cámara, ubicación y compresión; reporte sin conexión y cola de subida | ⬜     |
| 2 · IA                   | 25–30 nov | `classifyReportPhoto` con Gemini, `decideVerdict` con pruebas, `evaluations`; «Mis reportes» en vivo; push al autor    | ⬜     |
| 3 · Mapa y operador      | 1–4 dic   | Mapa por cercanía; bandeja del operador con claims; alertas FCM; App Check, Crashlytics, Remote Config                 | ⬜     |
| 4 · Cierre               | 5–7 dic   | `ecoreporte-prod`, despliegue con WIF, APK `preview` en Releases, README con capturas y GIF, video, `v1.0.0`           | ⬜     |

**Terminada** quiere decir que cumple el estándar común de la ruta (repositorio público, pruebas, CI, APK, README, video, sin secretos).
