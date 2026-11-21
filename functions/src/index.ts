import { setGlobalOptions } from 'firebase-functions/v2';

import { REGION } from './config';

// Todas las funciones corren en la región de los datos (ADR 0005).
setGlobalOptions({ region: REGION });

// Las funciones se exportan aquí a medida que se construyen, empezando por
// classifyReportPhoto (#12). Lista completa en docs/04-infraestructura.md.
export {};
