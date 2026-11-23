# 03 · Modelo de datos

## Firestore

### `reports/{reportId}`

El ID lo genera la app (`doc().id`) para poder crear el reporte sin conexión y nombrar la foto igual.

| Campo               | Tipo                               | Lo escribe                                                              | Notas                                                                                                                                                                                        |
| ------------------- | ---------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `authorUid`         | string                             | App (al crear)                                                          | Debe ser `request.auth.uid`                                                                                                                                                                  |
| `status`            | string                             | App: solo `pending_upload` y `cancelled`. Function y operador: el resto | Ver la máquina de estados en `02-arquitectura.md`                                                                                                                                            |
| `createdAt`         | timestamp                          | App (`serverTimestamp()`)                                               | Las reglas exigen `request.time`                                                                                                                                                             |
| `capturedAt`        | timestamp                          | App                                                                     | Hora del teléfono al tomar la foto; puede diferir de `createdAt` si no había red                                                                                                             |
| `location`          | geopoint                           | App                                                                     |                                                                                                                                                                                              |
| `locationAccuracyM` | number                             | App                                                                     | ≤ `LOCATION_MAX_ACCURACY_M`                                                                                                                                                                  |
| `geohash`           | string (9)                         | App                                                                     | Para consultas por cercanía (`geofire-common`)                                                                                                                                               |
| `note`              | string ≤ 280                       | App                                                                     | Opcional                                                                                                                                                                                     |
| `photo`             | map `{path, width, height, bytes}` | App                                                                     | `path = reports/{uid}/{reportId}.jpg`                                                                                                                                                        |
| `ai`                | map                                | **Solo la Function**                                                    | `{category, complexity, confidence, summary, containsPeople, model, promptVersion, latencyMs, evaluatedAt}`                                                                                  |
| `statusHistory`     | array ≤ 20 de `{status, by, at}`   | Function y operador                                                     | Rastro de cambios. La Function firma con `by: system` y agrega `reason` (`ai_failed` · `ai_disabled` · `ai_daily_limit` · `user_daily_limit`) cuando manda a revisión sin veredicto de la IA |
| `updatedAt`         | timestamp                          | Todos                                                                   |                                                                                                                                                                                              |

Valores cerrados:

- `category`: `via_publica` · `domiciliario_ilegal` · `escombros` · `sin_residuo`
- `complexity`: `baja` · `media` · `alta`

### `reports/{reportId}/evaluations/{evaluationId}`

Bitácora inmutable de cada llamada a la IA (la «base de logs» del documento original): entrada (ruta de la imagen, versión del prompt, modelo), salida cruda, salida validada, latencia, error y costo estimado en tokens. Solo la lee `operator`/`admin`. Nadie la escribe desde el cliente.

Un documento por intento (`classify-uploaded-photo.ts`): `{attempt, provider, model, promptVersion, photoPath, classification, rawOutput, error: {reason, message}, latencyMs, tokens: {input, output}, createdAt}`. Si el intento falló, `classification` es `null` y `error.reason` es `invalid_output`, `timeout` o `provider`.

### `alerts/{alertId}`

`{reportId, category, complexity, location, createdAt, status: open|acknowledged|closed, acknowledgedBy, acknowledgedAt}`. El ID es el del reporte: un reporte tiene a lo sumo una alerta. La crea la Function en la misma transacción del veredicto, con `status: open`, cuando la complejidad llega a `ALERT_COMPLEXITY` y el veredicto no es `rejected` (`shouldAlert()` en `functions/src/reports/alert.ts`). `acknowledgedBy` y `acknowledgedAt` los pone el operador al atenderla. Solo la leen y actualizan los operadores.

### `users/{uid}`

`{displayName, createdAt, reportsToday: {date, count}, fcmTokens: [≤ 5]}`. El usuario lee y edita su documento salvo `reportsToday`, que es de la Function. **El rol no va aquí:** va en los custom claims del token (`role`).

La app lo crea al registrarse, solo con `displayName` y `createdAt` (`serverTimestamp()`), en `src/features/auth/data/auth-repository.ts`.

`reportsToday` lo lleva `classifyReportPhoto`: `date` es el día en Colombia (`AAAA-MM-DD`) y `count` los reportes cuya foto llegó ese día. Al pasar de `REPORTS_PER_USER_PER_DAY`, el reporte va a `needs_review` sin llamar a la IA.

### `aiUsage/{AAAA-MM-DD}`

`{date, count, updatedAt}`: llamadas a la IA del día (hora de Colombia), reintentos incluidos. Lo escribe solo la Function, en una transacción, y no deja pasar de `AI_DAILY_LIMIT`. El cliente no lo lee ni lo escribe: cae en el cierre general de las reglas.

### Índices compuestos (`firebase/firestore.indexes.json`)

| Colección | Campos                          | Para                       |
| --------- | ------------------------------- | -------------------------- |
| `reports` | `authorUid ASC, createdAt DESC` | Mis reportes               |
| `reports` | `status ASC, geohash ASC`       | Mapa por cercanía y estado |
| `reports` | `status ASC, createdAt DESC`    | Bandeja del operador       |
| `alerts`  | `status ASC, createdAt DESC`    | Alertas abiertas           |

## Cloud Storage

| Ruta                            | Quién escribe          | Quién lee                                              | Límites                                  |
| ------------------------------- | ---------------------- | ------------------------------------------------------ | ---------------------------------------- |
| `reports/{uid}/{reportId}.jpg`  | El dueño, una sola vez | El dueño, `operator`, `admin`; la Function             | `image/jpeg`, `< PHOTO_MAX_BYTES` (2 MB) |
| `thumbs/{reportId}.jpg` (extra) | Solo la Function       | Cualquier usuario con sesión, si el reporte es público | 400 px                                   |

La foto de un reporte `rejected` o `cancelled` se borra a los `PHOTO_RETENTION_REJECTED_DAYS` días (función programada `purgeRejectedPhotos`).

## Reglas de acceso (resumen)

| Operación               | Ciudadano                                                                     | Operador                                                                 | Function (Admin SDK) |
| ----------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------- |
| Crear reporte           | Sí: propio, `status == pending_upload`, sin `ai`, campos en lista blanca      | Sí                                                                       | —                    |
| Leer reporte            | Propios (cualquier estado) y públicos (`approved`, `in_progress`, `resolved`) | Todos                                                                    | Todos                |
| Actualizar reporte      | Solo `note` mientras esté en `pending_upload`, o pasarlo a `cancelled`        | Solo `status` (transiciones de operador) + `statusHistory` + `updatedAt` | Todo                 |
| Borrar                  | No                                                                            | No                                                                       | Sí                   |
| `evaluations`, `alerts` | No                                                                            | Leer; `alerts` también actualizar `status`                               | Todo                 |

Las reglas se prueban con `@firebase/rules-unit-testing` contra el emulador (`npm run test:rules`, en `firebase/__tests__/`): cada regla tiene una prueba de **quién sí** y otra de **quién no**.

- Una prueba recorre todos los pares de estados y exige que `firestore.rules` permita exactamente las transiciones de `report-status.ts`.
- Los límites (precisión, nota, tamaño de la foto, nombre) se importan de los `limits.ts`, así que si la app y las reglas se desalinean, una prueba falla.
- `firebase` (SDK web) va fijado en la misma versión que exige React Native Firebase (13.1.0). Con dos copias de `@firebase/app`, el modo compat que usa `rules-unit-testing` no encuentra Firestore.
