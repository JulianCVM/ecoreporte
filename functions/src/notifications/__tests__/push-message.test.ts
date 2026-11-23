import { alertPush, statusPush } from '../push-message';

describe('statusPush', () => {
  it('avisa el veredicto con el reporte y el estado en los datos', () => {
    expect(statusPush('r1', 'processing_ai', 'approved')).toEqual({
      title: 'Tu reporte fue aprobado',
      body: 'Ya aparece en el mapa y espera atención.',
      data: { type: 'report_status', reportId: 'r1', status: 'approved' },
    });
  });

  it('avisa cada cambio que hace el operador', () => {
    expect(statusPush('r1', 'needs_review', 'rejected')?.data.status).toBe('rejected');
    expect(statusPush('r1', 'approved', 'in_progress')?.data.status).toBe('in_progress');
    expect(statusPush('r1', 'in_progress', 'resolved')?.data.status).toBe('resolved');
  });

  it('no avisa los estados intermedios de la subida', () => {
    expect(statusPush('r1', undefined, 'pending_upload')).toBeNull();
    expect(statusPush('r1', 'pending_upload', 'processing_ai')).toBeNull();
  });

  it('no avisa si el documento cambió pero el estado no', () => {
    expect(statusPush('r1', 'approved', 'approved')).toBeNull();
  });
});

describe('alertPush', () => {
  it('lleva el reporte para que la app abra la bandeja', () => {
    expect(alertPush({ reportId: 'r1', category: 'escombros' }).data).toEqual({
      type: 'operator_alert',
      reportId: 'r1',
    });
  });
});
