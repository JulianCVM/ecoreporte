# 05 · Parametrización

Cada valor que cambia el comportamiento está aquí con su valor por defecto, su rango y el lugar donde vive. **Un valor que no está en esta tabla no debería existir en el código como número suelto.**

## Build (app.config.ts)

| Parámetro                   | Valores                                  | Por defecto                                                                                                                     | Efecto                                                                                                                                                                        |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_VARIANT`               | `development` · `preview` · `production` | `development`                                                                                                                   | Nombre («EcoReporte Dev»), paquete (`.dev`), archivo de Firebase                                                                                                              |
| `GOOGLE_SERVICES_JSON`      | Ruta a un archivo                        | `./google-services.json` en `development` y `preview`; `./google-services.prod.json` en `production` (proyectado). Fuera de git | Configuración de Firebase en Android. Si el archivo no existe, `app.config.ts` no lo declara: lint, pruebas y CI no lo necesitan, y el prebuild falla con el aviso del plugin |
| `GOOGLE_SERVICE_INFO_PLIST` | Ruta a un archivo                        | `./GoogleService-Info.plist`                                                                                                    | Configuración de Firebase en iOS. **Sin usar todavía:** iOS no se compila en esta etapa                                                                                       |

## Cliente (`EXPO_PUBLIC_*`, validadas con zod en `src/lib/config/env.ts`)

| Variable                            | Tipo                     | Por defecto                      | Rango                        | Efecto                                                                                                     |
| ----------------------------------- | ------------------------ | -------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_ENV`                   | `local` · `dev` · `prod` | `local`                          | —                            | Etiqueta del entorno en la pantalla de perfil y en Crashlytics                                             |
| `EXPO_PUBLIC_USE_EMULATORS`         | booleano                 | `true` en local                  | —                            | Conecta Auth, Firestore, Storage y Functions al emulador                                                   |
| `EXPO_PUBLIC_EMULATOR_HOST`         | host                     | `10.0.2.2` (emulador de Android) | IP o host                    | Celular físico por USB: `127.0.0.1` con `npm run android:puertos` (`adb reverse`). Por Wi-Fi: la IP del PC |
| `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN` | texto                    | vacío                            | —                            | Solo en dev                                                                                                |
| `EXPO_PUBLIC_MAP_STYLE_URL`         | URL                      | estilo `liberty` de OpenFreeMap  | URL de un estilo de MapLibre | Mapa sin clave ni costo (ADR 0008)                                                                         |

## Constantes del dominio en el cliente (`src/features/reports/domain/limits.ts`)

| Constante                  | Por defecto      | Rango    | Por qué                                                     |
| -------------------------- | ---------------- | -------- | ----------------------------------------------------------- |
| `PHOTO_MAX_EDGE_PX`        | 1600             | 800–2400 | Detalle suficiente para la IA sin pasar de 2 MB             |
| `PHOTO_JPEG_QUALITY`       | 0.7              | 0.5–0.9  | Tamaño frente a calidad                                     |
| `PHOTO_MAX_BYTES`          | 2 097 152 (2 MB) | —        | Igual al límite de `storage.rules`                          |
| `LOCATION_MAX_ACCURACY_M`  | 50               | 10–100   | Por encima, la app no deja enviar                           |
| `LOCATION_GOOD_ACCURACY_M` | 10               | —        | Meta del documento original; la app la muestra como «buena» |
| `NOTE_MAX_CHARS`           | 280              | —        | Igual a las reglas                                          |
| `UPLOAD_MAX_ATTEMPTS`      | 8                | 3–20     | Reintentos de la cola antes de pedir ayuda al usuario       |
| `UPLOAD_BACKOFF_BASE_MS`   | 2 000            | —        | Espera exponencial: 2 s, 4 s, 8 s… hasta 5 min              |

## Constantes de la cuenta en el cliente (`src/features/auth/domain/limits.ts`)

| Constante                | Por defecto | Por qué                                                                                                      |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------ |
| `PASSWORD_MIN_LENGTH`    | 8           | Firebase Auth acepta desde 6; se piden 8, el mínimo de NIST SP 800-63B. Solo se exige al crear la cuenta     |
| `DISPLAY_NAME_MIN_CHARS` | 2           | Nombre visible en el perfil                                                                                  |
| `DISPLAY_NAME_MAX_CHARS` | 40          | Cabe en una línea del perfil y del rastro del operador. **[PROPUESTO]** que `firestore.rules` lo valide (#7) |

## Remote Config (cambia sin publicar la app; el valor por defecto va en el código)

| Clave                       | Por defecto | Efecto                                                  |
| --------------------------- | ----------- | ------------------------------------------------------- |
| `map_radius_km`             | 2           | Radio de la consulta por cercanía                       |
| `map_resolved_visible_days` | 7           | Días que un reporte resuelto sigue en el mapa           |
| `report_enabled`            | `true`      | Interruptor para pausar nuevos reportes (mantenimiento) |
| `banner_message`            | vacío       | Aviso en la pantalla de inicio                          |

## Servidor (`params` y secretos de Cloud Functions, `functions/src/config.ts`)

En local los valores salen de `functions/.env.local` y los secretos de `functions/.secret.local`, ambos fuera de git. En la producción proyectada salen de `functions/.env.prod` y de Secret Manager.

| Parámetro                       | Tipo        | Por defecto                                 | Rango                            | Efecto                                                                                                                                                                              |
| ------------------------------- | ----------- | ------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER`                   | texto       | `mock`                                      | `mock` · `gemini-api` · `vertex` | Quién clasifica la foto (ADR 0007). `mock` es determinista y sin red (pruebas y CI); `gemini-api` usa la capa gratuita con clave (desarrollo); `vertex` es la producción proyectada |
| `GEMINI_API_KEY`                | **secreto** | —                                           | —                                | Solo con `gemini-api`                                                                                                                                                               |
| `AI_ENABLED`                    | booleano    | `true`                                      | —                                | `false` → todo va a `needs_review`, sin llamar a la IA                                                                                                                              |
| `GEMINI_MODEL`                  | texto       | el Gemini Flash vigente **[POR CONFIRMAR]** | —                                | Modelo de clasificación (el mismo nombre sirve en los dos proveedores)                                                                                                              |
| `VERTEX_LOCATION`               | texto       | `us-east1`                                  | regiones de Vertex               | Solo con `vertex`                                                                                                                                                                   |
| `AI_DAILY_LIMIT`                | int         | 200                                         | 1–capa gratuita                  | Tope global de llamadas al día. Lo mantiene por debajo de la cuota gratuita; al llegar, los reportes van a `needs_review`                                                           |
| `AI_APPROVE_THRESHOLD`          | float       | 0.80                                        | 0.5–0.99                         | Confianza mínima para `approved`                                                                                                                                                    |
| `AI_REVIEW_THRESHOLD`           | float       | 0.50                                        | 0.1–`AI_APPROVE_THRESHOLD`       | Por debajo → `rejected`                                                                                                                                                             |
| `AI_TIMEOUT_MS`                 | int         | 15 000                                      | 5 000–60 000                     | Tiempo máximo de la llamada                                                                                                                                                         |
| `AI_MAX_ATTEMPTS`               | int         | 2                                           | 1–3                              | Reintentos por error técnico                                                                                                                                                        |
| `AI_MAX_INSTANCES`              | int         | 3                                           | 1–10                             | Tope de concurrencia (costo en producción)                                                                                                                                          |
| `PROMPT_VERSION`                | texto       | `v1`                                        | —                                | Se guarda en cada evaluación para comparar versiones                                                                                                                                |
| `FCM_ENABLED`                   | booleano    | `false` en local                            | —                                | Enviar push desde la función (en local necesita la credencial opcional de `04-infraestructura.md`)                                                                                  |
| `REPORTS_PER_USER_PER_DAY`      | int         | 10                                          | 1–100                            | Más que eso → `needs_review` y aviso                                                                                                                                                |
| `PHOTO_RETENTION_REJECTED_DAYS` | int         | 30                                          | 1–365                            | Purga de fotos rechazadas o canceladas                                                                                                                                              |
| `ALERT_COMPLEXITY`              | texto       | `alta`                                      | `media` · `alta`                 | Desde qué complejidad se crea una alerta                                                                                                                                            |

Regla de veredicto (función pura `decideVerdict`, con pruebas):

1. Si `category == sin_residuo` → `rejected`.
2. Si `confidence ≥ AI_APPROVE_THRESHOLD` → `approved`.
3. Si `confidence ≥ AI_REVIEW_THRESHOLD` → `needs_review`.
4. Si no → `rejected`.
5. Si la IA falla después de `AI_MAX_ATTEMPTS`, está apagada o se alcanzó `AI_DAILY_LIMIT` → `needs_review`.

## Eventos de Analytics

| Evento                  | Parámetros                                         |
| ----------------------- | -------------------------------------------------- |
| `report_started`        | —                                                  |
| `report_created`        | `offline` (bool), `accuracy_m`                     |
| `report_uploaded`       | `attempts`, `bytes`, `delay_s` (desde la creación) |
| `report_verdict_seen`   | `status`                                           |
| `report_status_changed` | `from`, `to` (lo dispara el operador)              |
| `map_opened`            | `radius_km`                                        |
