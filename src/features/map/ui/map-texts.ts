import type { Complexity, WasteCategory } from '@/features/reports/domain/types';

/** Nombres cortos para los filtros y las tarjetas del mapa. */
export const CATEGORY_NAMES: Record<WasteCategory, string> = {
  via_publica: 'Vía pública',
  domiciliario_ilegal: 'Domiciliario',
  escombros: 'Escombros',
  sin_residuo: 'Sin residuos',
};

export const COMPLEXITY_NAMES: Record<Complexity, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
};
