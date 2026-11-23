import { canTransition, hasVerdict, isFinal, isPublic, nextStatuses } from '../report-status';
import { REPORT_STATUSES } from '../types';

describe('máquina de estados del reporte', () => {
  it('el autor solo puede cancelar mientras el reporte no se ha subido', () => {
    expect(canTransition('author', 'pending_upload', 'cancelled')).toBe(true);
    expect(canTransition('author', 'approved', 'cancelled')).toBe(false);
    expect(canTransition('author', 'pending_upload', 'approved')).toBe(false);
  });

  it('el operador decide los needs_review y avanza los aprobados', () => {
    expect(canTransition('operator', 'needs_review', 'approved')).toBe(true);
    expect(canTransition('operator', 'needs_review', 'rejected')).toBe(true);
    expect(canTransition('operator', 'approved', 'in_progress')).toBe(true);
    expect(canTransition('operator', 'in_progress', 'resolved')).toBe(true);
  });

  it('el operador no puede saltarse la IA ni reabrir', () => {
    expect(canTransition('operator', 'pending_upload', 'approved')).toBe(false);
    expect(canTransition('operator', 'processing_ai', 'approved')).toBe(false);
    expect(canTransition('operator', 'resolved', 'in_progress')).toBe(false);
    expect(canTransition('operator', 'approved', 'resolved')).toBe(false);
  });

  it('solo el sistema emite veredictos de la IA', () => {
    expect(canTransition('system', 'processing_ai', 'approved')).toBe(true);
    expect(canTransition('system', 'processing_ai', 'rejected')).toBe(true);
    expect(canTransition('author', 'processing_ai', 'approved')).toBe(false);
  });

  it('los estados finales no tienen salida para nadie', () => {
    for (const status of REPORT_STATUSES.filter(isFinal)) {
      expect(nextStatuses('author', status)).toEqual([]);
      expect(nextStatuses('operator', status)).toEqual([]);
      expect(nextStatuses('system', status)).toEqual([]);
    }
  });

  it('solo aprobados, en curso y resueltos son públicos', () => {
    expect(REPORT_STATUSES.filter(isPublic)).toEqual(['approved', 'in_progress', 'resolved']);
  });
});

describe('hasVerdict', () => {
  it('hay veredicto desde que la IA o el operador deciden', () => {
    expect(REPORT_STATUSES.filter(hasVerdict)).toEqual(
      expect.arrayContaining(['approved', 'needs_review', 'rejected', 'in_progress', 'resolved']),
    );
  });

  it('un reporte sin subir, en análisis o cancelado todavía no tiene veredicto', () => {
    expect(hasVerdict('pending_upload')).toBe(false);
    expect(hasVerdict('processing_ai')).toBe(false);
    expect(hasVerdict('cancelled')).toBe(false);
  });
});
