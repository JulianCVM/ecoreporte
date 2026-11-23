import { z } from 'zod';

/** Valores cerrados de docs/03-modelo-de-datos.md; la app los repite en `domain/types.ts`. */
export const WASTE_CATEGORIES = [
  'via_publica',
  'domiciliario_ilegal',
  'escombros',
  'sin_residuo',
] as const;
export const COMPLEXITIES = ['baja', 'media', 'alta'] as const;

/** Largo máximo del resumen: una frase para el operador, no un párrafo. */
export const SUMMARY_MAX_CHARS = 200;

/**
 * Lo que devuelve la IA por cada foto (ADR 0003). Es el mismo esquema para los tres
 * proveedores: se le entrega al modelo como esquema de respuesta y con él se valida lo que
 * llega. El veredicto no está aquí: lo decide `decideVerdict()`.
 */
export const classificationSchema = z.object({
  category: z.enum(WASTE_CATEGORIES),
  complexity: z.enum(COMPLEXITIES),
  /** Autoevaluación del modelo entre 0 y 1; no es una probabilidad calibrada (ADR 0003). */
  confidence: z.number().min(0).max(1),
  summary: z.string().trim().min(1).max(SUMMARY_MAX_CHARS),
  containsPeople: z.boolean(),
});
export type Classification = z.infer<typeof classificationSchema>;

/** Esquema JSON que se le pasa al modelo para que responda con esta forma. */
export const classificationJsonSchema = z.toJSONSchema(classificationSchema);

/**
 * Valida el texto que devolvió el modelo.
 *
 * @returns La clasificación, o el motivo por el que no sirve. No lanza: una salida inválida
 * es un error técnico esperado, no una excepción que tumbe la función.
 */
export function parseClassificationText(
  text: string | null | undefined,
): { ok: true; classification: Classification } | { ok: false; problem: string } {
  if (!text || text.trim().length === 0) return { ok: false, problem: 'respuesta vacía' };
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, problem: 'la respuesta no es JSON' };
  }
  const parsed = classificationSchema.safeParse(json);
  if (parsed.success) return { ok: true, classification: parsed.data };
  const problem = parsed.error.issues
    .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('; ');
  return { ok: false, problem };
}
