import { useEffect, useState } from 'react';

import { getDownloadURL, ref, storage } from '@/lib/firebase';

import type { MyReport } from '../domain/my-report';
import { photoOrigin } from '../domain/report-photo';
import type { UploadEntry } from '../domain/upload-queue';

// La URL de descarga de una foto no cambia: se pide una vez por sesión, no por cada tarjeta.
const downloadUrls = new Map<string, Promise<string>>();

function downloadUrl(photoPath: string): Promise<string> {
  let url = downloadUrls.get(photoPath);
  if (!url) {
    url = getDownloadURL(ref(storage(), photoPath));
    downloadUrls.set(photoPath, url);
    // Un fallo (sin red) no se queda guardado: la próxima vez se vuelve a pedir.
    url.catch(() => downloadUrls.delete(photoPath));
  }
  return url;
}

/**
 * URI de la foto de un reporte para mostrársela a su autor, o `null` si no hay o no se pudo
 * obtener. Las reglas de Storage solo dejan leerla al autor y a los operadores.
 *
 * @param entry Entrada del reporte en la cola de subida, si sigue ahí.
 */
export function useReportPhotoUri(
  report: Pick<MyReport, 'status' | 'photoPath'>,
  entry: UploadEntry | undefined,
): string | null {
  const origin = photoOrigin(report.status, entry !== undefined);
  const remotePath = origin === 'remote' ? report.photoPath : null;
  const [remote, setRemote] = useState<{ path: string; uri: string } | null>(null);

  useEffect(() => {
    if (!remotePath) return;
    let cancelled = false;
    downloadUrl(remotePath).then(
      (uri) => {
        if (!cancelled) setRemote({ path: remotePath, uri });
      },
      (cause) => console.warn(`[reports] no se pudo leer la foto ${remotePath}`, cause),
    );
    return () => {
      cancelled = true;
    };
  }, [remotePath]);

  if (origin === 'local') return entry?.localUri ?? null;
  return remote && remote.path === remotePath ? remote.uri : null;
}
