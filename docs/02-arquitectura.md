# 02 · Arquitectura

## Contexto

```mermaid
flowchart LR
  C([Ciudadano]) -->|foto + GPS| APP[App EcoReporte<br/>Expo + React Native]
  O([Operador de aseo]) -->|bandeja, estados| APP
  APP <-->|SDK nativo, offline| FS[(Cloud Firestore)]
  APP -->|subida de la foto| ST[(Cloud Storage<br/>for Firebase)]
  ST -->|evento: objeto finalizado| FN[Cloud Functions 2.ª gen]
  FN -->|imagen + prompt| VX[Gemini<br/>API gratuita en local · Vertex AI en prod]
  FN -->|veredicto, alerta| FS
  FN -->|push| FCM[Firebase Cloud Messaging]
  FCM --> APP
  APP --> CR[Crashlytics + Analytics]
  AC[App Check] -. protege .- FS & ST & FN
```

## Contenedores y responsabilidades

| Contenedor                      | Puede                                                                                                                                            | No puede                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| **App** (`src/`)                | Capturar, guardar en cola local, escribir el reporte en estado `pending_upload`, subir la foto, escuchar cambios, cambiar estados si es operador | Escribir `ai`, `status` de la IA ni alertas. Decidir el veredicto. Tener secretos |
| **Reglas** (`firebase/*.rules`) | Validar forma, dueño, transiciones permitidas y tamaño de la foto                                                                                | Llamar a la IA                                                                    |
| **Functions** (`functions/`)    | Clasificar, escribir el veredicto y el log de la evaluación, crear alertas, enviar push, limpiar                                                 | Confiar en lo que mandó el cliente sin revalidarlo                                |
| **Gemini** (`AI_PROVIDER`)      | Devolver categoría, complejidad, confianza y descripción en JSON con esquema                                                                     | Persistir nada                                                                    |

## Flujo de un reporte

```mermaid
sequenceDiagram
  autonumber
  participant U as Ciudadano
  participant A as App
  participant Q as Cola local (archivos)
  participant F as Firestore
  participant S as Storage
  participant FN as Function classifyReportPhoto
  participant G as Gemini (AI_PROVIDER)
  U->>A: Toma la foto y confirma
  A->>A: Comprime (≤ PHOTO_MAX_EDGE_PX, JPEG PHOTO_JPEG_QUALITY)
  A->>F: set reports/{id} status=pending_upload (funciona sin red)
  A->>Q: Guarda la foto y la entrada {id, path, intentos}
  Note over A,Q: El usuario ya ve su reporte en «Mis reportes»
  Q-->>S: Al haber red: sube reports/{uid}/{id}.jpg
  S->>FN: onObjectFinalized
  FN->>F: Lee el reporte y verifica dueño y estado
  FN->>F: status=processing_ai
  FN->>G: Imagen + prompt + responseSchema
  G-->>FN: {category, complexity, confidence, summary}
  FN->>FN: Valida con zod y aplica los umbrales
  FN->>F: Transacción: status + ai + evaluations/{n} (+ alerts/{id} si es alta)
  FN-->>A: Push al autor (y a operadores si hay alerta)
  F-->>A: El listener actualiza la pantalla
```

**Por qué el reporte se escribe antes de la IA** (el documento pedía interceptar antes de la base): sin conexión no hay IA, y el reporte no se puede perder. Se escribe en un estado de cuarentena que nadie más ve, y la IA lo promueve o lo descarta. Ver [ADR 0004](adr/0004-reporte-en-cuarentena-hasta-el-veredicto.md).

## Máquina de estados del reporte

```mermaid
stateDiagram-v2
  [*] --> pending_upload: la app crea el reporte
  pending_upload --> processing_ai: la foto llegó a Storage (Function)
  processing_ai --> approved: confianza ≥ AI_APPROVE_THRESHOLD
  processing_ai --> needs_review: entre umbrales, o la IA falló
  processing_ai --> rejected: sin_residuo o confianza < AI_REVIEW_THRESHOLD
  needs_review --> approved: operador
  needs_review --> rejected: operador
  approved --> in_progress: operador
  in_progress --> resolved: operador
  pending_upload --> cancelled: autor (antes de subir)
  resolved --> [*]
  rejected --> [*]
  cancelled --> [*]
```

- **Visibles en el mapa público:** `approved`, `in_progress` y `resolved` (este último durante `MAP_RESOLVED_VISIBLE_DAYS`).
- **Si la IA falla** (timeout, cuota o respuesta inválida) después de `AI_MAX_ATTEMPTS`, el reporte va a `needs_review`: un error técnico nunca rechaza un reporte.
- **Si `AI_ENABLED=false`**, todo reporte va directo a `needs_review`.
- Las transiciones viven en `src/features/reports/domain/report-status.ts` (con pruebas) y se repiten en las reglas de Firestore.

## Estructura del código

```
ecoreporte/
├── src/
│   ├── app/                    ← solo rutas (Expo Router)
│   │   ├── _layout.tsx
│   │   ├── (tabs)/             ← reportar, mapa, mis reportes, perfil
│   │   └── (auth)/             ← inicio de sesión
│   ├── features/
│   │   ├── auth/
│   │   ├── reports/
│   │   │   ├── domain/         ← tipos, estados, reglas puras (con pruebas)
│   │   │   ├── data/           ← repositorio Firestore + cola de subida
│   │   │   └── ui/
│   │   ├── map/
│   │   └── operator/
│   ├── lib/
│   │   ├── config/             ← lectura y validación de EXPO_PUBLIC_*
│   │   ├── firebase/           ← inicialización y emuladores
│   │   └── geo/                ← geohash y distancias
│   ├── components/  hooks/  constants/
├── functions/                  ← Cloud Functions (TypeScript, paquete propio)
├── firebase/                   ← firestore.rules, storage.rules, índices
├── firebase.json  .firebaserc
├── app.config.ts  eas.json
└── docs/
```

**Fronteras:** las pantallas no importan el SDK de Firebase; usan los hooks y repositorios de `features/*/data`. `domain/` no importa nada de React ni de Firebase.

## Decisiones (ADR)

| #                                                             | Decisión                                                                     |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [0001](adr/0001-development-build-y-react-native-firebase.md) | Development build + React Native Firebase (no Expo Go ni el SDK web)         |
| [0002](adr/0002-firebase-gcp-en-lugar-de-la-pila-original.md) | Firebase y GCP en lugar de Spring Boot + PostgreSQL + TFLite                 |
| [0003](adr/0003-ia-en-servidor-con-gemini.md)                 | IA en el servidor con Gemini y salida estructurada; umbrales como parámetros |
| [0004](adr/0004-reporte-en-cuarentena-hasta-el-veredicto.md)  | El reporte se escribe primero y queda en cuarentena hasta el veredicto       |
| [0005](adr/0005-entornos-y-region.md)                         | Entornos (local, dev, prod) y región `us-east1`                              |
| [0006](adr/0006-alertas-con-fcm-y-listeners.md)               | Alertas con FCM y listeners en lugar de WebSocket                            |
| [0007](adr/0007-costo-cero-con-spark-y-emuladores.md)         | Costo cero: Spark, emuladores, IA intercambiable y producción proyectada     |
| [0008](adr/0008-mapa-con-maplibre-y-openfreemap.md)           | Mapa con MapLibre y teselas de OpenFreeMap                                   |

## Riesgos abiertos

| Riesgo                                                  | Mitigación                                                                                                                                                        |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fotos con personas o placas identificables              | Aviso en la cámara («enfoca los residuos»); la IA marca `contains_people`; esas fotos no se muestran en el mapa público. **[POR DECIDIR]** si además se difuminan |
| Abuso (spam de reportes)                                | Sesión obligatoria, App Check, `REPORTS_PER_USER_PER_DAY`, tamaño máximo de la foto                                                                               |
| Costo de la IA                                          | `AI_ENABLED`, `maxInstances`, alerta de presupuesto, un solo intento por foto salvo error técnico                                                                 |
| La subida en segundo plano se corta si se cierra la app | La cola se reanuda al abrir la app; la subida en segundo plano real es extra                                                                                      |
| Ubicación imprecisa en interiores                       | Precisión mínima configurable; el usuario ve la precisión antes de enviar                                                                                         |
