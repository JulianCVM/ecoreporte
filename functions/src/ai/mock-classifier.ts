import { createHash } from 'node:crypto';

import type { Classification } from './classification';
import type { Classifier, ClassifierOutput, PhotoInput } from './classifier';

/**
 * Respuestas del proveedor `mock`. Cubren los caminos de `decideVerdict()` con los umbrales
 * por defecto: aprobado (con y sin alerta), a revisión y rechazado por las dos vías.
 */
export const MOCK_CLASSIFICATIONS: readonly Classification[] = [
  {
    category: 'via_publica',
    complexity: 'baja',
    confidence: 0.93,
    summary: 'Bolsas de basura sobre el andén.',
    containsPeople: false,
  },
  {
    category: 'escombros',
    complexity: 'alta',
    confidence: 0.88,
    summary: 'Montón grande de escombros que ocupa parte de la vía.',
    containsPeople: false,
  },
  {
    category: 'domiciliario_ilegal',
    complexity: 'media',
    confidence: 0.64,
    summary: 'Posibles residuos domiciliarios fuera de horario; la foto no es clara.',
    containsPeople: false,
  },
  {
    category: 'sin_residuo',
    complexity: 'baja',
    confidence: 0.91,
    summary: 'No se ven residuos en la imagen.',
    containsPeople: false,
  },
  {
    category: 'via_publica',
    complexity: 'baja',
    confidence: 0.31,
    summary: 'Imagen oscura; no se distingue si hay residuos.',
    containsPeople: true,
  },
];

/**
 * Clasificador de pruebas y CI (ADR 0007): sin red, sin clave y determinista. La misma foto
 * siempre recibe la misma respuesta, elegida por el hash de sus bytes.
 */
export class MockClassifier implements Classifier {
  readonly provider = 'mock';
  readonly model = 'mock';

  async classify(photo: PhotoInput): Promise<ClassifierOutput> {
    const digest = createHash('sha256').update(photo.bytes).digest();
    const classification =
      MOCK_CLASSIFICATIONS[digest.readUInt32BE(0) % MOCK_CLASSIFICATIONS.length];
    return {
      classification,
      rawOutput: JSON.stringify(classification),
      tokens: { input: null, output: null },
    };
  }
}
