import { parseReportDetail, reportTimeline, reviewReasonText } from '../report-detail';

const timestamp = (ms: number) => ({ toMillis: () => ms });
const CAPTURED_MS = 1_795_000_000_000;

const base = { status: 'approved', capturedAt: timestamp(CAPTURED_MS) };
const system = (status: string, ms: number, reason?: string) => ({
  status,
  by: 'system',
  at: timestamp(ms),
  ...(reason ? { reason } : {}),
});

describe('parseReportDetail', () => {
  it('arma el historial: captura, análisis y veredicto', () => {
    const detail = parseReportDetail('r1', {
      ...base,
      statusHistory: [
        system('processing_ai', CAPTURED_MS + 1000),
        system('approved', CAPTURED_MS + 3000),
      ],
    });

    expect(detail?.timeline.map((step) => [step.status, step.atMs, step.by])).toEqual([
      ['pending_upload', CAPTURED_MS, 'author'],
      ['processing_ai', CAPTURED_MS + 1000, 'system'],
      ['approved', CAPTURED_MS + 3000, 'system'],
    ]);
  });

  it('conserva el motivo de la revisión', () => {
    const detail = parseReportDetail('r1', {
      ...base,
      status: 'needs_review',
      statusHistory: [system('needs_review', CAPTURED_MS + 1, 'ai_daily_limit')],
    });
    expect(detail?.timeline.at(-1)?.reason).toBe('ai_daily_limit');
  });

  it('lee la clasificación y la ubicación', () => {
    const detail = parseReportDetail('r1', {
      ...base,
      location: { latitude: 7.1193, longitude: -73.1227 },
      ai: { category: 'escombros', complexity: 'alta', summary: 'Escombros.', confidence: 0.9 },
    });

    expect(detail?.ai).toEqual({
      category: 'escombros',
      complexity: 'alta',
      summary: 'Escombros.',
    });
    expect([detail?.latitude, detail?.longitude]).toEqual([7.1193, -73.1227]);
  });

  it('un reporte recién creado sin conexión no tiene ai ni historial y se muestra igual', () => {
    const detail = parseReportDetail('r1', { ...base, status: 'pending_upload' });

    expect(detail).toMatchObject({ ai: null, latitude: null, longitude: null });
    expect(detail?.timeline).toHaveLength(1);
  });

  it('omite lo dañado sin descartar el reporte', () => {
    const detail = parseReportDetail('r1', {
      ...base,
      ai: { category: 'otra', complexity: 'alta', summary: 'x' },
      statusHistory: [{ status: 'approved' }, system('approved', CAPTURED_MS + 5)],
    });

    expect(detail?.ai).toBeNull();
    expect(detail?.timeline).toHaveLength(2);
  });

  it('descarta el documento que tampoco sirve para la lista', () => {
    expect(parseReportDetail('r1', { status: 'approved' })).toBeNull();
  });
});

describe('reportTimeline', () => {
  it('agrega el estado actual sin hora cuando no quedó en el rastro (canceló el autor)', () => {
    const steps = reportTimeline({ status: 'cancelled', capturedAtMs: CAPTURED_MS }, []);

    expect(steps.map((step) => [step.status, step.atMs])).toEqual([
      ['pending_upload', CAPTURED_MS],
      ['cancelled', null],
    ]);
  });
});

describe('reviewReasonText', () => {
  it('explica cada motivo conocido y no falla con uno nuevo', () => {
    expect(reviewReasonText('user_daily_limit')).toMatch(/reportes diarios/);
    expect(reviewReasonText('motivo_futuro')).toBe('No se pudo analizar automáticamente.');
  });
});
