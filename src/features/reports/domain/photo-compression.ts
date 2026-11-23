import {
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_BYTES,
  PHOTO_MAX_EDGE_PX,
  PHOTO_MIN_EDGE_PX,
  PHOTO_MIN_JPEG_QUALITY,
} from './limits';

export type PhotoDimensions = { widthPx: number; heightPx: number };

/** Un intento de compresión: lado mayor máximo y calidad JPEG (0–1). */
export type CompressionStep = { maxEdgePx: number; jpegQuality: number };

/** Foto ya codificada en JPEG y guardada en un archivo local. */
export type EncodedPhoto = PhotoDimensions & { uri: string; bytes: number };

/**
 * Intentos en orden: primero los valores normales y luego se sacrifica calidad antes que
 * resolución, porque la IA necesita el detalle. El último usa los dos pisos de `limits.ts`.
 */
export const PHOTO_COMPRESSION_STEPS: readonly CompressionStep[] = [
  { maxEdgePx: PHOTO_MAX_EDGE_PX, jpegQuality: PHOTO_JPEG_QUALITY },
  { maxEdgePx: PHOTO_MAX_EDGE_PX, jpegQuality: PHOTO_MIN_JPEG_QUALITY },
  {
    maxEdgePx: Math.round((PHOTO_MAX_EDGE_PX + PHOTO_MIN_EDGE_PX) / 2),
    jpegQuality: PHOTO_MIN_JPEG_QUALITY,
  },
  { maxEdgePx: PHOTO_MIN_EDGE_PX, jpegQuality: PHOTO_MIN_JPEG_QUALITY },
];

/** La foto no cupo en `PHOTO_MAX_BYTES` ni con la compresión más fuerte. */
export class PhotoTooLargeError extends Error {
  constructor(readonly bytes: number) {
    super(
      `La foto pesa ${bytes} bytes después de comprimirla al máximo; el límite es ${PHOTO_MAX_BYTES}.`,
    );
    this.name = 'PhotoTooLargeError';
  }
}

/**
 * Dimensiones con el lado mayor en `maxEdgePx` como mucho, sin deformar ni agrandar.
 * Una foto más pequeña que el límite se queda como está.
 */
export function fitWithinMaxEdge(
  { widthPx, heightPx }: PhotoDimensions,
  maxEdgePx: number = PHOTO_MAX_EDGE_PX,
): PhotoDimensions {
  const longEdgePx = Math.max(widthPx, heightPx);
  if (![widthPx, heightPx, maxEdgePx].every((px) => Number.isFinite(px) && px > 0)) {
    throw new RangeError(`Dimensiones inválidas: ${widthPx}×${heightPx}, lado máximo ${maxEdgePx}`);
  }
  if (longEdgePx <= maxEdgePx) return { widthPx, heightPx };
  const scale = maxEdgePx / longEdgePx;
  return {
    widthPx: Math.max(1, Math.round(widthPx * scale)),
    heightPx: Math.max(1, Math.round(heightPx * scale)),
  };
}

/** `storage.rules` acepta la foto hasta `PHOTO_MAX_BYTES` inclusive; un archivo vacío no es foto. */
export function isPhotoWithinLimit(bytes: number): boolean {
  return Number.isFinite(bytes) && bytes > 0 && bytes <= PHOTO_MAX_BYTES;
}

/**
 * Comprime probando `steps` en orden y devuelve el primer resultado que cabe en el límite.
 *
 * @param encode Codifica la foto con un intento (lo implementa `data/photo-compressor.ts`).
 * @param discard Recibe cada resultado descartado, para borrar su archivo.
 * @throws PhotoTooLargeError si ningún intento cabe: nunca devuelve una foto que
 * `storage.rules` rechazaría.
 */
export async function compressToLimit(
  encode: (step: CompressionStep) => Promise<EncodedPhoto>,
  discard: (photo: EncodedPhoto) => void = () => {},
  steps: readonly CompressionStep[] = PHOTO_COMPRESSION_STEPS,
): Promise<EncodedPhoto> {
  let lastBytes = 0;
  for (const step of steps) {
    const photo = await encode(step);
    if (isPhotoWithinLimit(photo.bytes)) return photo;
    lastBytes = photo.bytes;
    discard(photo);
  }
  throw new PhotoTooLargeError(lastBytes);
}
