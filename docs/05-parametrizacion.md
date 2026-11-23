# 05 · Parametrización

Cada valor que cambia el comportamiento está aquí con su valor por defecto, su rango y el lugar donde vive. **Un valor que no está en esta tabla no debería existir en el código como número suelto.**

## Build (app.config.ts)

| Parámetro                   | Valores                                  | Por defecto                                                                                                                     | Efecto                                                                                                                                                                        |
| --------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `APP_VARIANT`               | `development` · `preview` · `production` | `development`                                                                                                                   | Nombre («EcoReporte Dev»), paquete (`.dev`), archivo de Firebase                                                                                                              |
| `GOOGLE_SERVICES_JSON`      | Ruta a un archivo                        | `./google-services.json` en `development` y `preview`; `./google-services.prod.json` en `production` (proyectado). Fuera de git | Configuración de Firebase en Android. Si el archivo no existe, `app.config.ts` no lo declara: lint, pruebas y CI no lo necesitan, y el prebuild falla con el aviso del plugin |
| `GOOGLE_SERVICE_INFO_PLIST` | Ruta a un archivo                        | `./GoogleService-Info.plist`                                                                                                    | Configuración de Firebase en iOS. **Sin usar todavía:** iOS no se compila en esta etapa                                                                                       |

**Permisos nativos** (config plugins de `app.config.ts`; cambiarlos exige un development build nuevo):

| Plugin          | Configuración                                                                                                    | Efecto                                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `expo-camera`   | `recordAudioAndroid: false`, `microphonePermission: false`, `barcodeScannerEnabled: false`                       | El APK solo pide `CAMERA`: la app toma fotos, no graba audio ni lee códigos (RF01)                                        |
| `expo-location` | `locationAlwaysAndWhenInUsePermission: false`, `locationAlwaysPermission: false`, `motionUsagePermission: false` | Ubicación solo en primer plano (`ACCESS_FINE_LOCATION` y `ACCESS_COARSE_LOCATION`), sin segundo plano ni actividad física |

## Cliente (`EXPO_PUBLIC_*`, validadas con zod en `src/lib/config/env.ts`)

| Variable                            | Tipo                     | Por defecto                      | Rango                        | Efecto                                                                                                     |
| ----------------------------------- | ------------------------ | -------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_ENV`                   | `local` · `dev` · `prod` | `local`                          | —                            | Etiqueta del entorno en la pantalla de perfil y en Crashlytics                                             |
| `EXPO_PUBLIC_USE_EMULATORS`         | booleano                 | `true` en local                  | —                            | Conecta Auth, Firestore, Storage y Functions al emulador                                                   |
| `EXPO_PUBLIC_EMULATOR_HOST`         | host                     | `10.0.2.2` (emulador de Android) | IP o host                    | Celular físico por USB: `127.0.0.1` con `npm run android:puertos` (`adb reverse`). Por Wi-Fi: la IP del PC |
| `EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN` | texto                    | vacío                            | —                            | Solo en dev                                                                                                |
| `EXPO_PUBLIC_MAP_STYLE_URL`         | URL                      | estilo `liberty` de OpenFreeMap  | URL de un estilo de MapLibre | Mapa sin clave ni costo (ADR 0008)                                                                         |

## Constantes del dominio en el cliente (`src/features/reports/domain/limits.ts`)

| Constante                     | Por defecto        | Rango      | Por qué                                                                |
| ----------------------------- | ------------------ | ---------- | ---------------------------------------------------------------------- |
| `PHOTO_MAX_EDGE_PX`           | 1600               | 800–2400   | Detalle suficiente para la IA sin pasar de 2 MB                        |
| `PHOTO_JPEG_QUALITY`          | 0.7                | 0.5–0.9    | Tamaño frente a calidad                                                |
| `PHOTO_MAX_BYTES`             | 2 097 152 (2 MB)   | —          | Igual al límite de `storage.rules`                                     |
| `PHOTO_MIN_EDGE_PX`           | 800                | —          | Piso del lado mayor si la foto no cabe en 2 MB                         |
| `PHOTO_MIN_JPEG_QUALITY`      | 0.5                | —          | Piso de la calidad si la foto no cabe en 2 MB                          |
| `LOCATION_MAX_ACCURACY_M`     | 50                 | 10–100     | Por encima, la app no deja enviar                                      |
| `LOCATION_GOOD_ACCURACY_M`    | 10                 | —          | Meta del documento original; la app la muestra como «buena»            |
| `LOCATION_UPDATE_INTERVAL_MS` | 2 000              | —          | Cada cuánto llega una lectura del GPS con la pantalla Reportar abierta |
| `NOTE_MAX_CHARS`              | 280                | —          | Igual a las reglas                                                     |
| `MY_REPORTS_LIMIT`            | 50                 | 10–200     | Reportes que trae «Mis reportes», los más recientes primero            |
| `OPERATOR_INBOX_LIMIT`        | 50                 | 10–200     | Reportes que trae la bandeja del operador (`features/operator`)        |
| `MAP_RADIUS_M`                | 3 000              | 500–10 000 | Radio de la búsqueda del mapa alrededor del usuario (`features/map`)   |
| `MAP_REPORTS_PER_RANGE_LIMIT` | 50                 | 10–200     | Tope de reportes por cada rango de geohash de la consulta del mapa     |
| `MAP_INITIAL_ZOOM`            | 13                 | —          | Zoom con el que el radio de búsqueda cabe en la pantalla               |
| `MAP_FALLBACK_CENTER`         | 7.11935, -73.12274 | —          | Centro de Bucaramanga: donde abre el mapa sin permiso de ubicación     |
| `UPLOAD_MAX_ATTEMPTS`         | 8                  | 3–20       | Reintentos de la cola antes de pedir ayuda al usuario                  |
| `UPLOAD_BACKOFF_BASE_MS`      | 2 000              | —          | Espera exponencial: 2 s, 4 s, 8 s… hasta 5 min                         |
| `UPLOAD_ATTEMPT_TIMEOUT_MS`   | 30 000             | —          | Tope de un intento de subida; después falla y espera el reintento      |

**Compresión de la foto** (`domain/photo-compression.ts`): la app prueba cuatro intentos en orden y se queda con el primero que pesa `PHOTO_MAX_BYTES` o menos. Baja la calidad antes que la resolución, porque la IA necesita el detalle: 1600 px a 0.7 → 1600 px a 0.5 → 1200 px a 0.5 → 800 px a 0.5. Si ninguno cabe, la app pide repetir la foto; nunca sube una que `storage.rules` rechazaría.

**Cola de subida** (`domain/upload-queue.ts` y `data/upload-queue*.ts`, ADR 0004): al enviar, la foto se copia a `upload-queue/` en el almacenamiento de documentos de la app y su entrada se guarda en `upload-queue/queue.json`. La cola hace una pasada al abrir la app, al volver a primer plano, al volver la red, al encolar una foto y cuando vence la espera del reintento; sin red no gasta intentos. Tras `UPLOAD_MAX_ATTEMPTS` fallos la entrada queda en `failed` y espera al usuario: «Mis reportes» lo avisa en la tarjeta y el botón «Reintentar la subida» la reinicia (`withRetriedReport`). Si `storage.rules` niega la subida porque la foto ya estaba en Storage, la entrada cuenta como subida.

**Foto del reporte** (`domain/report-photo.ts`): mientras la foto está en la cola, la tarjeta y el detalle muestran la copia del teléfono, así que se ve sin conexión. La cola borra esa copia al subirla; después la foto se lee de Storage con su URL de descarga, que las reglas solo dan al autor y a los operadores. Un reporte cancelado antes de subir no tiene foto.

**Mapa** (`src/features/map/`, RF05, ADR 0008): la consulta pide los reportes públicos (`approved`, `in_progress`, `resolved`) por rangos de geohash alrededor del usuario (`geohashRanges`), con un listener por rango, y descarta por distancia real los que quedan fuera de `MAP_RADIUS_M`. El centro de la búsqueda se redondea a tres decimales (unos 110 m) para no repetir la consulta con cada lectura del GPS. Los filtros por estado, tipo y complejidad se aplican en el teléfono. El estado de cada punto se ve por su color y, con texto y símbolo, en la lista de abajo.

**Geohash** (`src/lib/geo/geohash.ts`): `GEOHASH_PRECISION` = 9 caracteres (celdas de unos 5 m). Es el largo que exige `firestore.rules` y se calcula con `geofire-common`, la misma librería de las consultas por cercanía del mapa.

## Constantes de la cuenta en el cliente (`src/features/auth/domain/limits.ts`)

| Constante                | Por defecto | Por qué                                                                                                          |
| ------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| `PASSWORD_MIN_LENGTH`    | 8           | Firebase Auth acepta desde 6; se piden 8, el mínimo de NIST SP 800-63B. Solo se exige al crear la cuenta         |
| `DISPLAY_NAME_MIN_CHARS` | 2           | Nombre visible en el perfil                                                                                      |
| `DISPLAY_NAME_MAX_CHARS` | 40          | Cabe en una línea del perfil y del rastro del operador. `firestore.rules` valida el mismo rango en `users/{uid}` |

## Remote Config (cambia sin publicar la app; el valor por defecto va en el código)

| Clave                       | Por defecto | Efecto                                                  |
| --------------------------- | ----------- | ------------------------------------------------------- |
| `map_radius_km`             | 2           | Radio de la consulta por cercanía                       |
| `map_resolved_visible_days` | 7           | Días que un reporte resuelto sigue en el mapa           |
| `report_enabled`            | `true`      | Interruptor para pausar nuevos reportes (mantenimiento) |
| `banner_message`            | vacío       | Aviso en la pantalla de inicio                          |

## Servidor (`params` y secretos de Cloud Functions, `functions/src/config.ts`)

En local los valores salen de `functions/.env.local` y los secretos de `functions/.secret.local`, ambos fuera de git; sus moldes son `functions/.env.example` y `functions/.secret.local.example`. En la producción proyectada salen de `functions/.env.prod` y de Secret Manager.

- **Validación:** `readServerConfig()` lee los parámetros dentro de cada función y los valida con zod (`functions/src/server-config.ts`). Un valor fuera de rango hace fallar la función con un error que nombra el parámetro, en vez de clasificar con él.
- **Umbrales:** Firebase no tiene parámetros decimales (`defineFloat`), así que `AI_APPROVE_THRESHOLD` y `AI_REVIEW_THRESHOLD` se declaran como texto (`"0.80"`) y se convierten a número al validar.
- **Región:** las funciones corren en `us-east1` (`REGION`, ADR 0005).

| Parámetro                       | Tipo        | Por defecto                                 | Rango                            | Efecto                                                                                                                                                                                                                  |
| ------------------------------- | ----------- | ------------------------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AI_PROVIDER`                   | texto       | `mock`                                      | `mock` · `gemini-api` · `vertex` | Quién clasifica la foto (ADR 0007). `mock` es determinista y sin red (pruebas y CI); `gemini-api` usa la capa gratuita con clave (desarrollo); `vertex` es la producción proyectada                                     |
| `GEMINI_API_KEY`                | **secreto** | —                                           | —                                | Solo con `gemini-api`                                                                                                                                                                                                   |
| `AI_ENABLED`                    | booleano    | `true`                                      | —                                | `false` → todo va a `needs_review`, sin llamar a la IA                                                                                                                                                                  |
| `GEMINI_MODEL`                  | texto       | el Gemini Flash vigente **[POR CONFIRMAR]** | —                                | Modelo de clasificación (el mismo nombre sirve en los dos proveedores)                                                                                                                                                  |
| `VERTEX_LOCATION`               | texto       | `us-east1`                                  | regiones de Vertex               | Solo con `vertex`                                                                                                                                                                                                       |
| `AI_DAILY_LIMIT`                | int         | 200                                         | 1–capa gratuita                  | Tope global de llamadas al día. Lo mantiene por debajo de la cuota gratuita; al llegar, los reportes van a `needs_review`                                                                                               |
| `AI_APPROVE_THRESHOLD`          | float       | 0.80                                        | 0.5–0.99                         | Confianza mínima para `approved`                                                                                                                                                                                        |
| `AI_REVIEW_THRESHOLD`           | float       | 0.50                                        | 0.1–`AI_APPROVE_THRESHOLD`       | Por debajo → `rejected`                                                                                                                                                                                                 |
| `AI_TIMEOUT_MS`                 | int         | 15 000                                      | 5 000–60 000                     | Tiempo máximo de la llamada                                                                                                                                                                                             |
| `AI_MAX_ATTEMPTS`               | int         | 2                                           | 1–3                              | Reintentos por error técnico                                                                                                                                                                                            |
| `AI_MAX_INSTANCES`              | int         | 3                                           | 1–10                             | Tope de concurrencia (costo en producción)                                                                                                                                                                              |
| `PROMPT_VERSION`                | texto       | `v1`                                        | —                                | Se guarda en cada evaluación para comparar versiones                                                                                                                                                                    |
| `FCM_ENABLED`                   | booleano    | `false` en local                            | —                                | Enviar push desde la función (en local necesita la credencial opcional de `04-infraestructura.md`)                                                                                                                      |
| `REPORTS_PER_USER_PER_DAY`      | int         | 10                                          | 1–100                            | Más que eso → `needs_review` y aviso                                                                                                                                                                                    |
| `PHOTO_RETENTION_REJECTED_DAYS` | int         | 30                                          | 1–365                            | Purga de fotos rechazadas o canceladas                                                                                                                                                                                  |
| `ALERT_COMPLEXITY`              | texto       | `alta`                                      | `media` · `alta`                 | Desde qué complejidad se crea una alerta                                                                                                                                                                                |
| `REPORTS_BUCKET`                | texto       | el bucket del proyecto                      | —                                | Bucket que escucha `classifyReportPhoto`. En local se fija en `.env.local` con el `storage_bucket` de `google-services.json`: sin sesión del CLI el emulador supone `<proyecto>.appspot.com` y la función no se dispara |

Regla de veredicto (función pura `decideVerdict`, con pruebas):

1. Si `category == sin_residuo` → `rejected`.
2. Si `confidence ≥ AI_APPROVE_THRESHOLD` → `approved`.
3. Si `confidence ≥ AI_REVIEW_THRESHOLD` → `needs_review`.
4. Si no → `rejected`.
5. Si la IA falla después de `AI_MAX_ATTEMPTS`, está apagada o se alcanzó `AI_DAILY_LIMIT` → `needs_review`.

**`classifyReportPhoto`** (`functions/src/reports/`): disparador de Storage con `maxInstances = AI_MAX_INSTANCES`. Comprueba que la ruta sea `reports/{uid}/{id}.jpg`, que el reporte sea de ese autor y que siga en `pending_upload`; en una transacción lo pasa a `processing_ai`, llama a la IA hasta `AI_MAX_ATTEMPTS` veces, guarda cada intento en `evaluations` y escribe el veredicto con `ai` y `ai.latencyMs`. Un reporte cancelado o ya clasificado se ignora.

| Constante              | Valor | Por qué                                                                                                     |
| ---------------------- | ----- | ----------------------------------------------------------------------------------------------------------- |
| `REPORT_WAIT_ATTEMPTS` | 5     | La foto puede llegar a Storage antes que el documento a Firestore: la función vuelve a buscarlo estas veces |
| `REPORT_WAIT_MS`       | 1 000 | Espera entre búsquedas. Pasados 5 s sin documento, la foto se ignora y queda para la purga                  |

**Clasificador** (`functions/src/ai/`, ADR 0003 y 0007): `createClassifier()` devuelve la implementación de `Classifier` que pide `AI_PROVIDER`.

- `mock` elige una de cinco respuestas fijas por el hash de la foto: la misma foto siempre da lo mismo, sin red ni clave. Es el único proveedor de las pruebas y de la CI.
- `gemini-api` y `vertex` comparten `GeminiClassifier` (`@google/genai`): mandan la foto, el prompt de `PROMPT_VERSION` y el esquema de respuesta, con temperatura 0 y corte a los `AI_TIMEOUT_MS`. `vertex` no se ha ejecutado: exige Blaze.
- La respuesta se valida con el mismo esquema zod (`classification.ts`): `category`, `complexity`, `confidence` entre 0 y 1, `summary` de hasta `SUMMARY_MAX_CHARS` (200) y `containsPeople`. Una salida inválida, un corte por tiempo o un fallo del proveedor son un `ClassifierError`, es decir, un error técnico.
- Los prompts viven en `prompt.ts`, uno por versión. Una versión publicada no se edita: se agrega otra. Una `PROMPT_VERSION` que no existe hace fallar la función al arrancar.

## Eventos de Analytics

| Evento                  | Parámetros                                         |
| ----------------------- | -------------------------------------------------- |
| `report_started`        | —                                                  |
| `report_created`        | `offline` (bool), `accuracy_m`                     |
| `report_uploaded`       | `attempts`, `bytes`, `delay_s` (desde la creación) |
| `report_verdict_seen`   | `status`                                           |
| `report_status_changed` | `from`, `to` (lo dispara el operador)              |
| `map_opened`            | `radius_km`                                        |
