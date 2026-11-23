import { addUserReport, countOn, reserveAiCall, usageDay } from '../usage-limits';

const DAY = '2026-11-23';

describe('usageDay', () => {
  it('usa el día de Colombia, no el de UTC', () => {
    // 03:30 UTC del 24 todavía es 22:30 del 23 en Colombia (UTC−5).
    expect(usageDay(Date.UTC(2026, 10, 24, 3, 30))).toBe('2026-11-23');
    expect(usageDay(Date.UTC(2026, 10, 24, 5, 0))).toBe('2026-11-24');
  });
});

describe('countOn', () => {
  it('un contador de otro día, ausente o dañado vale cero', () => {
    expect(countOn({ date: DAY, count: 4 }, DAY)).toBe(4);
    expect(countOn({ date: '2026-11-22', count: 4 }, DAY)).toBe(0);
    expect(countOn(undefined, DAY)).toBe(0);
    expect(countOn({ date: DAY, count: '4' }, DAY)).toBe(0);
    expect(countOn({ date: DAY, count: -1 }, DAY)).toBe(0);
  });
});

describe('addUserReport', () => {
  it('el reporte número «límite» entra; el siguiente no', () => {
    expect(addUserReport({ date: DAY, count: 9 }, DAY, 10)).toEqual({
      next: { date: DAY, count: 10 },
      withinLimit: true,
    });
    expect(addUserReport({ date: DAY, count: 10 }, DAY, 10)).toEqual({
      next: { date: DAY, count: 11 },
      withinLimit: false,
    });
  });

  it('el primer reporte de un día nuevo empieza la cuenta', () => {
    expect(addUserReport({ date: '2026-11-22', count: 50 }, DAY, 10)).toEqual({
      next: { date: DAY, count: 1 },
      withinLimit: true,
    });
  });
});

describe('reserveAiCall', () => {
  it('reserva mientras hay cupo y deja de sumar al llegar al tope', () => {
    expect(reserveAiCall(undefined, DAY, 2)).toEqual({ date: DAY, count: 1 });
    expect(reserveAiCall({ date: DAY, count: 1 }, DAY, 2)).toEqual({ date: DAY, count: 2 });
    expect(reserveAiCall({ date: DAY, count: 2 }, DAY, 2)).toBeNull();
  });
});
