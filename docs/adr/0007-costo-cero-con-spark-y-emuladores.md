# ADR 0007 · Costo cero: plan Spark, emuladores y producción proyectada

- **Estado:** aceptada · 2026-11-18
- **Modifica:** [ADR 0003](0003-ia-en-servidor-con-gemini.md) (proveedor de la IA) y [ADR 0005](0005-entornos-y-region.md) (entornos)

## Contexto

El proyecto no tiene presupuesto. El plan Blaze de Firebase pide tarjeta, y sin él no hay:

- Cloud Functions;
- Cloud Storage for Firebase: los buckets nuevos lo exigen desde octubre de 2024;
- Vertex AI.

Aun así, la app tiene que mostrar las prácticas de un desarrollo móvil empresarial: funciones en el servidor, reglas probadas, IA en el servidor y entornos separados.

## Decisión

1. **El entorno de trabajo es `local`.** Auth, Firestore, Storage y Functions corren en la Firebase Emulator Suite. El código es el mismo que iría a producción.
2. **`ecoreporte-dev` se queda en Spark** y solo se usa para lo gratuito que no se emula: `google-services.json`, FCM, Crashlytics, Analytics y Remote Config.
3. **La IA va detrás de una interfaz `Classifier`** con tres implementaciones, que se eligen con `AI_PROVIDER`:
   - `mock`: determinista y sin red. Se usa en pruebas y en CI.
   - `gemini-api`: Gemini Developer API con la capa gratuita y una clave de AI Studio, sin tarjeta. Es la de desarrollo.
   - `vertex`: Vertex AI con la identidad de la cuenta de servicio. Es la de producción, proyectada.

   El esquema de respuesta, la validación con zod y `decideVerdict()` son los mismos para las tres.

4. **Topes gratuitos como parámetros:** `AI_DAILY_LIMIT` mantiene las llamadas por debajo de la cuota gratuita. Al llegar al tope, el reporte va a `needs_review`; no falla.
5. **La producción queda proyectada:** recursos, IAM, despliegue con WIF y costos están escritos en `04-infraestructura.md`. Activarla es cambiar el plan, los parámetros y `AI_PROVIDER=vertex`, sin tocar el código.

## Alternativas descartadas

- **Blaze con alertas de presupuesto:** exige tarjeta, y las alertas no detienen el gasto.
- **Guardar la foto en base64 dentro de Firestore** para evitar Storage: rompe el límite de 1 MiB por documento, encarece las lecturas y es una mala práctica que no se mostraría en una entrevista.
- **Clasificar en el teléfono para no depender de la nube:** descartado por las razones de ADR 0003.

## Consecuencias

- ➕ Costo cero y el mismo código para desarrollo y producción.
- ➕ Las pruebas y la CI no dependen de cuotas ni de la red (`mock`).
- ➖ El demo corre con el PC encendido: el APK de `preview` apunta a los emuladores. Se dice así en el README.
- ➖ La capa gratuita de Gemini tiene límites bajos y condiciones de uso de datos distintas a las de Vertex: en desarrollo solo se usan fotos de prueba sin personas.
- ➖ FCM no se emula. Enviar push desde el emulador necesita una credencial local opcional; sin ella, `FCM_ENABLED=false`.
