import {
  applyFilters,
  formatDistance,
  MAP_CATEGORIES,
  MAP_STATUSES,
  NO_FILTERS,
  parseMapReport,
  toggled,
  type MapReport,
} from '../map-report';

const document = (overrides: Record<string, unknown> = {}) => ({
  status: 'approved',
  location: { latitude: 7.12, longitude: -73.12 },
  ai: { category: 'escombros', complexity: 'alta', summary: 'Escombros en la vía.' },
  authorUid: 'uid-1',
  ...overrides,
});

const report = (overrides: Partial<MapReport> = {}): MapReport => ({
  id: 'r1',
  status: 'approved',
  latitude: 7.12,
  longitude: -73.12,
  category: 'via_publica',
  complexity: 'baja',
  summary: 'Bolsas.',
  ...overrides,
});

describe('parseMapReport', () => {
  it('lee un reporte público sin exponer a su autor', () => {
    expect(parseMapReport('r1', document())).toEqual({
      id: 'r1',
      status: 'approved',
      latitude: 7.12,
      longitude: -73.12,
      category: 'escombros',
      complexity: 'alta',
      summary: 'Escombros en la vía.',
    });
  });

  it('descarta un reporte que no es público aunque llegue en la consulta', () => {
    for (const status of ['needs_review', 'rejected', 'pending_upload', 'cancelled']) {
      expect(parseMapReport('r1', document({ status }))).toBeNull();
    }
  });

  it('descarta un documento sin ubicación o sin clasificación', () => {
    expect(parseMapReport('r1', document({ location: undefined }))).toBeNull();
    expect(parseMapReport('r1', document({ ai: undefined }))).toBeNull();
  });
});

describe('filtros', () => {
  const reports = [
    report({ id: 'a', status: 'approved', category: 'escombros', complexity: 'alta' }),
    report({ id: 'b', status: 'resolved', category: 'via_publica', complexity: 'baja' }),
    report({ id: 'c', status: 'in_progress', category: 'escombros', complexity: 'media' }),
  ];
  const ids = (found: MapReport[]) => found.map((current) => current.id);

  it('sin filtros se ven todos', () => {
    expect(ids(applyFilters(reports, NO_FILTERS))).toEqual(['a', 'b', 'c']);
  });

  it('dentro de un filtro suma opciones; entre filtros las exige todas', () => {
    const filters = { ...NO_FILTERS, statuses: ['approved', 'in_progress'] as const };
    expect(ids(applyFilters(reports, filters))).toEqual(['a', 'c']);
    expect(ids(applyFilters(reports, { ...filters, complexities: ['alta'] }))).toEqual(['a']);
  });

  it('toggled agrega y quita', () => {
    expect(toggled(['alta'], 'baja')).toEqual(['alta', 'baja']);
    expect(toggled(['alta', 'baja'], 'alta')).toEqual(['baja']);
  });

  it('el mapa solo ofrece estados públicos y tipos con residuos', () => {
    expect(MAP_STATUSES).toEqual(['approved', 'in_progress', 'resolved']);
    expect(MAP_CATEGORIES).not.toContain('sin_residuo');
  });
});

describe('formatDistance', () => {
  it('usa metros hasta el kilómetro y después kilómetros con coma', () => {
    expect(formatDistance(349.6)).toBe('350 m');
    expect(formatDistance(1234)).toBe('1,2 km');
  });
});
