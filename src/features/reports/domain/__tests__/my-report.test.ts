import { parseMyReport, statusPresentation } from '../my-report';
import { REPORT_STATUSES } from '../types';

const timestamp = (ms: number) => ({ toMillis: () => ms });

describe('parseMyReport', () => {
  it('lee un reporte recién creado sin conexión, que todavía no tiene createdAt', () => {
    const data = { status: 'pending_upload', capturedAt: timestamp(1_795_000_000_000) };

    expect(parseMyReport('r1', data)).toEqual({
      id: 'r1',
      status: 'pending_upload',
      capturedAtMs: 1_795_000_000_000,
      note: null,
    });
  });

  it('conserva la nota', () => {
    const data = { status: 'approved', capturedAt: timestamp(1), note: 'Bolsas rotas' };
    expect(parseMyReport('r1', data)?.note).toBe('Bolsas rotas');
  });

  it('descarta un documento con un estado que la app no conoce', () => {
    expect(parseMyReport('r1', { status: 'archivado', capturedAt: timestamp(1) })).toBeNull();
  });

  it('descarta un documento sin fecha de captura válida', () => {
    expect(parseMyReport('r1', { status: 'approved', capturedAt: '2026-11-23' })).toBeNull();
    expect(parseMyReport('r1', { status: 'approved' })).toBeNull();
    expect(parseMyReport('r1', undefined)).toBeNull();
  });
});

describe('statusPresentation', () => {
  it('ningún estado se queda sin símbolo, nombre ni explicación', () => {
    for (const status of REPORT_STATUSES) {
      const { symbol, label, description } = statusPresentation(status);
      expect([symbol, label, description].every((text) => text.length > 0)).toBe(true);
    }
  });

  it('cada estado tiene un nombre distinto: no se confunden en la lista', () => {
    const labels = REPORT_STATUSES.map((status) => statusPresentation(status).label);
    expect(new Set(labels).size).toBe(REPORT_STATUSES.length);
  });
});
