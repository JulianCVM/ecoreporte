import { nextStatuses } from '@/features/reports/domain/report-status';
import { REPORT_STATUSES } from '@/features/reports/domain/types';

import { INBOX_STATUSES, operatorActions } from '../operator-actions';

describe('operatorActions', () => {
  it('un reporte en revisión se puede aprobar o rechazar', () => {
    expect(operatorActions('needs_review').map((action) => action.to)).toEqual([
      'approved',
      'rejected',
    ]);
  });

  it('un aprobado solo puede pasar a atención, y de ahí a resuelto', () => {
    expect(operatorActions('approved').map((action) => action.to)).toEqual(['in_progress']);
    expect(operatorActions('in_progress').map((action) => action.to)).toEqual(['resolved']);
  });

  it('toda transición del operador tiene botón: ninguna se queda sin texto', () => {
    for (const status of REPORT_STATUSES) {
      expect(operatorActions(status).map((action) => action.to)).toEqual(
        nextStatuses('operator', status),
      );
    }
  });

  it('la bandeja trae justo los estados en los que el operador puede hacer algo', () => {
    const actionable = REPORT_STATUSES.filter((status) => operatorActions(status).length > 0);
    expect([...INBOX_STATUSES].sort()).toEqual([...actionable].sort());
  });
});
