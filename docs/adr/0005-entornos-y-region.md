# ADR 0005 · Entornos y región

- **Estado:** aceptada · 2026-11-18 · **modificada por [ADR 0007](0007-costo-cero-con-spark-y-emuladores.md)**: el entorno de trabajo es `local` (emuladores), `ecoreporte-dev` queda en Spark y `prod` se proyecta. La región aplica cuando se cree la base de producción

## Decisión

- **Tres entornos:** `local` (Emulator Suite, proyecto `demo-ecoreporte`), `dev` (`ecoreporte-dev`) y `prod` (`ecoreporte-prod`). Dos proyectos de nube aíslan los datos y las cuotas, y permiten romper dev sin tocar la demo.
- **Variantes de la app** con `APP_VARIANT`: dev y prod se instalan a la vez.
- **Región `us-east1`** para Firestore, Storage, Functions y Vertex AI.
  - Firestore **no permite cambiar la región** después de crear la base: esta es la decisión más difícil de deshacer del proyecto.
  - Entre las regiones con todos los servicios, `us-east1` es la de menor latencia esperada desde Colombia. `southamerica-east1` (São Paulo) queda más lejos por red.
  - Colocar todo en la misma región evita latencia y salida de datos entre regiones.
- **[POR CONFIRMAR]** que el modelo de Gemini elegido esté disponible en `us-east1`. Si no, solo `VERTEX_LOCATION` cambia (por ejemplo a `us-central1`), sin mover los datos.

## Consecuencias

- ➕ Se pueden probar las reglas y las funciones sin costo ni red.
- ➖ Dos proyectos duplican la configuración (Auth, App Check, Remote Config). El runbook de `04-infraestructura.md` lo hace repetible.
