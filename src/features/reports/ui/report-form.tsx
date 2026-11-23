import { Link } from 'expo-router';
import { useCallback, useState } from 'react';

import { FormError } from '@/components/form-error';
import { PrimaryButton } from '@/components/primary-button';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';

import { deletePhotoFile } from '../data/photo-compressor';
import { submitReport } from '../data/report-repository';
import { NOTE_MAX_CHARS } from '../domain/limits';
import { draftProblem } from '../domain/new-report';
import type { EncodedPhoto } from '../domain/photo-compression';
import type { LocationReading } from '../domain/report-location';
import { LocationStep } from './location-step';
import { PhotoStep } from './photo-step';

type Props = {
  /** Usuario con sesión: será el autor del reporte. */
  authorUid: string;
};

/** Foto lista y la hora del teléfono en que se tomó (`capturedAt`). */
type CapturedPhoto = { photo: EncodedPhoto; capturedAtMs: number };

/**
 * Formulario de la pantalla Reportar (RF01, RF01b): ubicación, foto, nota opcional y envío.
 * El reporte se guarda aunque no haya conexión; la foto sube sola desde la cola.
 */
export function ReportForm({ authorUid }: Props) {
  const [captured, setCaptured] = useState<CapturedPhoto | null>(null);
  const [reading, setReading] = useState<LocationReading | null>(null);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handlePhotoChange = useCallback((photo: EncodedPhoto | null) => {
    setCaptured(photo ? { photo, capturedAtMs: Date.now() } : null);
    setError(null);
    if (photo) setSaved(false);
  }, []);

  function handleSubmit() {
    const draft = { photo: captured?.photo ?? null, reading, note };
    const problem = draftProblem(draft);
    if (problem || !captured) {
      setError(problem);
      return;
    }
    try {
      submitReport(draft, authorUid, captured.capturedAtMs);
    } catch (cause) {
      setError(
        `No se pudo guardar el reporte: ${cause instanceof Error ? cause.message : String(cause)}`,
      );
      return;
    }
    try {
      // La cola ya tiene su propia copia: la del caché sobra.
      deletePhotoFile(captured.photo.uri);
    } catch (cause) {
      console.warn(`No se pudo borrar la foto temporal ${captured.photo.uri}:`, cause);
    }
    setCaptured(null);
    setNote('');
    setError(null);
    setSaved(true);
  }

  return (
    <>
      <LocationStep onReadingChange={setReading} />
      <PhotoStep photo={captured?.photo ?? null} onPhotoChange={handlePhotoChange} />
      {captured ? (
        <>
          <TextField
            label={`Nota (opcional, hasta ${NOTE_MAX_CHARS} caracteres)`}
            value={note}
            onChangeText={setNote}
            maxLength={NOTE_MAX_CHARS}
            multiline
            placeholder="Ej.: bolsas rotas junto al poste"
          />
          <FormError message={error} />
          <PrimaryButton label="Enviar el reporte" onPress={handleSubmit} />
        </>
      ) : null}
      {saved ? (
        <>
          <ThemedText type="smallBold" accessibilityLiveRegion="polite">
            ✓ Reporte guardado. La foto se sube sola cuando hay conexión.
          </ThemedText>
          <Link href="/mis-reportes" accessibilityRole="link">
            <ThemedText type="small" themeColor="primary">
              Ver mis reportes
            </ThemedText>
          </Link>
        </>
      ) : null}
    </>
  );
}
