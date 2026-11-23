import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import {
  compressToLimit,
  fitWithinMaxEdge,
  type CompressionStep,
  type EncodedPhoto,
} from '../domain/photo-compression';

/** Tamaño en bytes de un archivo local. Falla si no existe: sin tamaño no se puede validar. */
function fileBytes(uri: string): number {
  const { exists, size } = new File(uri).info();
  if (!exists || size == null) {
    throw new Error(`No se pudo leer el tamaño de la foto comprimida: ${uri}`);
  }
  return size;
}

/** Codifica `sourceUri` en JPEG con un intento de compresión y mide el archivo resultante. */
async function encodePhoto(sourceUri: string, step: CompressionStep): Promise<EncodedPhoto> {
  const original = await ImageManipulator.manipulate(sourceUri).renderAsync();
  try {
    // Las dimensiones salen de la imagen ya decodificada y orientada, no de lo que reporta la
    // cámara: algunos teléfonos entregan ancho y alto sin aplicar la orientación EXIF.
    const target = fitWithinMaxEdge(
      { widthPx: original.width, heightPx: original.height },
      step.maxEdgePx,
    );
    const resized = await ImageManipulator.manipulate(original)
      .resize({ width: target.widthPx, height: target.heightPx })
      .renderAsync();
    try {
      const saved = await resized.saveAsync({
        compress: step.jpegQuality,
        format: SaveFormat.JPEG,
      });
      return {
        uri: saved.uri,
        widthPx: saved.width,
        heightPx: saved.height,
        bytes: fileBytes(saved.uri),
      };
    } finally {
      resized.release();
    }
  } finally {
    original.release();
  }
}

/** Borra una foto local que ya no se usa (la original de la cámara o una repetida). */
export function deletePhotoFile(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
}

/**
 * Reduce y comprime la foto de la cámara hasta que cumple los límites de `limits.ts` (RF01).
 * Borra del caché los intentos que no cupieron.
 *
 * @param sourceUri Archivo local que entregó la cámara.
 * @throws PhotoTooLargeError si no cabe en `PHOTO_MAX_BYTES` ni con la compresión más fuerte.
 */
export function compressPhoto(sourceUri: string): Promise<EncodedPhoto> {
  return compressToLimit(
    (step) => encodePhoto(sourceUri, step),
    (rejected) => deletePhotoFile(rejected.uri),
  );
}
