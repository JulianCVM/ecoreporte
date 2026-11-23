import {
  classificationJsonSchema,
  parseClassificationText,
  SUMMARY_MAX_CHARS,
  type Classification,
} from '../classification';

const valid: Classification = {
  category: 'escombros',
  complexity: 'alta',
  confidence: 0.82,
  summary: 'Escombros sobre la vía.',
  containsPeople: false,
};

const parse = (value: unknown) => parseClassificationText(JSON.stringify(value));

describe('parseClassificationText', () => {
  it('acepta una respuesta que cumple el esquema', () => {
    expect(parse(valid)).toEqual({ ok: true, classification: valid });
  });

  it('una respuesta vacía o que no es JSON es un error técnico, no una excepción', () => {
    expect(parseClassificationText(undefined)).toEqual({ ok: false, problem: 'respuesta vacía' });
    expect(parseClassificationText('   ')).toEqual({ ok: false, problem: 'respuesta vacía' });
    expect(parseClassificationText('Claro, aquí va: {')).toEqual({
      ok: false,
      problem: 'la respuesta no es JSON',
    });
  });

  it('rechaza una categoría que el modelo inventó y nombra el campo', () => {
    const result = parse({ ...valid, category: 'chatarra' });
    expect(result).toMatchObject({ ok: false, problem: expect.stringContaining('category') });
  });

  it('rechaza una confianza fuera de 0 a 1: los umbrales dejarían de tener sentido', () => {
    expect(parse({ ...valid, confidence: 1.2 }).ok).toBe(false);
    expect(parse({ ...valid, confidence: -0.1 }).ok).toBe(false);
    expect(parse({ ...valid, confidence: '0.9' }).ok).toBe(false);
  });

  it('rechaza un resumen vacío o más largo que el límite', () => {
    expect(parse({ ...valid, summary: '  ' }).ok).toBe(false);
    expect(parse({ ...valid, summary: 'a'.repeat(SUMMARY_MAX_CHARS + 1) }).ok).toBe(false);
  });

  it('rechaza una respuesta a la que le falta un campo', () => {
    const incomplete: Record<string, unknown> = { ...valid };
    delete incomplete.containsPeople;
    expect(parse(incomplete)).toMatchObject({
      ok: false,
      problem: expect.stringContaining('containsPeople'),
    });
  });
});

describe('classificationJsonSchema', () => {
  it('le exige al modelo los cinco campos con sus valores cerrados', () => {
    expect(classificationJsonSchema).toMatchObject({
      type: 'object',
      required: ['category', 'complexity', 'confidence', 'summary', 'containsPeople'],
      properties: {
        category: { enum: ['via_publica', 'domiciliario_ilegal', 'escombros', 'sin_residuo'] },
        complexity: { enum: ['baja', 'media', 'alta'] },
      },
    });
  });
});
