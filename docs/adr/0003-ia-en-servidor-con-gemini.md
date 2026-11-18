# ADR 0003 · Clasificación en el servidor con Gemini y salida estructurada

- **Estado:** aceptada · 2026-11-18 · **modificada por [ADR 0007](0007-costo-cero-con-spark-y-emuladores.md)**: el proveedor ahora es intercambiable (`AI_PROVIDER`); Vertex AI queda para la producción proyectada

## Contexto

La clasificación debe ser confiable (no la puede falsear el cliente), auditable (la «base de logs» del documento) y barata.

## Opciones

1. **Modelo en el teléfono** (TFLite o ML Kit). Rápido y gratis, pero se puede falsear, ML Kit no conoce estas categorías y entrenar un modelo propio necesita un dataset que no existe.
2. **Cloud Vision API** (etiquetas genéricas). Barata, pero devuelve etiquetas («Waste», «Rubble») sin complejidad ni categoría propia: habría que traducirlas con reglas frágiles.
3. **Gemini en Vertex AI con `responseSchema`.** Devuelve directamente `{category, complexity, confidence, summary, containsPeople}` validado por esquema.

## Decisión

La opción 3, llamada desde la función `classifyReportPhoto` con el SDK `@google/genai` en modo Vertex AI y la identidad de la cuenta `fn-runtime@` (sin claves de API).

- La respuesta se valida otra vez con zod. Si no cumple, cuenta como error técnico.
- El veredicto **no** lo decide el modelo: lo decide `decideVerdict()` con los umbrales parametrizados (`05-parametrizacion.md`).
- Cada llamada queda en `reports/{id}/evaluations` con el modelo, `PROMPT_VERSION`, la latencia y los tokens.
- `confidence` es la autoevaluación del modelo, no una probabilidad calibrada. **[POR MEDIR]** con un set de 30–50 fotos etiquetadas a mano antes de fijar los umbrales.

## Consecuencias

- ➕ Cambiar el modelo, el prompt o los umbrales no exige publicar la app.
- ➖ Cada foto cuesta dinero y depende de la red: se compensa con `AI_ENABLED`, `maxInstances` y el tope diario.
- ➖ La latencia depende del modelo: RNF01 se mide y no se promete antes.
