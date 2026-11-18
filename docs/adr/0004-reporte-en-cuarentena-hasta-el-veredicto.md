# ADR 0004 · El reporte se escribe primero y queda en cuarentena hasta el veredicto

- **Estado:** aceptada · 2026-11-18

## Contexto

El documento pide que la IA intercepte el reporte **antes** de que llegue a la base. Pero el ciudadano suele estar en la calle, a veces sin señal, y el reporte no se puede perder. Además, la Storage de Firebase no encola subidas sin conexión: si se cierra la app, la subida se pierde.

## Decisión

1. La app crea `reports/{id}` con `status: pending_upload`. Firestore lo guarda en disco y lo sincroniza solo.
2. La foto se copia al almacenamiento de la app y entra a una **cola propia** (`src/features/reports/data/upload-queue.ts`) que reintenta con espera exponencial hasta `UPLOAD_MAX_ATTEMPTS`.
3. Cuando la foto llega a Storage, la función la clasifica y mueve el reporte de estado.
4. Mientras no haya veredicto, el reporte es **invisible para todos menos su autor** (reglas de Firestore). Es el equivalente a «no llega a la base» del documento: no llega a la base **pública**.

## Consecuencias

- ➕ Se puede reportar sin conexión. El autor ve su reporte al instante (RNF01b).
- ➕ El veredicto queda rastreable en la base, también el de los rechazados (útil para medir falsos positivos).
- ➖ Hay que purgar los rechazados y los abandonados (`purgeRejectedPhotos`; los `pending_upload` de más de 30 días pasan a `cancelled`).
- ➖ La cola es código propio que hay que probar: es la parte con más pruebas unitarias del cliente.
