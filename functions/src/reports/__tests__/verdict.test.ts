import { MOCK_CLASSIFICATIONS } from '../../ai/mock-classifier';
import { decideVerdict } from '../verdict';

const thresholds = { aiApproveThreshold: 0.8, aiReviewThreshold: 0.5 };
const waste = (confidence: number) => ({ category: 'via_publica', confidence }) as const;

describe('decideVerdict', () => {
  it('sin residuos se rechaza aunque el modelo esté muy seguro', () => {
    expect(decideVerdict({ category: 'sin_residuo', confidence: 0.99 }, thresholds)).toBe(
      'rejected',
    );
  });

  it('aprueba desde el umbral de aprobación, incluido', () => {
    expect(decideVerdict(waste(0.8), thresholds)).toBe('approved');
    expect(decideVerdict(waste(0.95), thresholds)).toBe('approved');
  });

  it('entre los dos umbrales va a revisión', () => {
    expect(decideVerdict(waste(0.79), thresholds)).toBe('needs_review');
    expect(decideVerdict(waste(0.5), thresholds)).toBe('needs_review');
  });

  it('por debajo del umbral de revisión se rechaza sin intervención humana', () => {
    expect(decideVerdict(waste(0.49), thresholds)).toBe('rejected');
    expect(decideVerdict(waste(0), thresholds)).toBe('rejected');
  });

  it('los umbrales son parámetros: al moverlos cambia el veredicto', () => {
    const strict = { aiApproveThreshold: 0.95, aiReviewThreshold: 0.9 };
    expect(decideVerdict(waste(0.85), thresholds)).toBe('approved');
    expect(decideVerdict(waste(0.85), strict)).toBe('rejected');
  });

  it('con umbrales iguales no queda franja de revisión', () => {
    const noReview = { aiApproveThreshold: 0.7, aiReviewThreshold: 0.7 };
    expect(decideVerdict(waste(0.7), noReview)).toBe('approved');
    expect(decideVerdict(waste(0.69), noReview)).toBe('rejected');
  });

  it('las respuestas del mock recorren los tres veredictos con los umbrales por defecto', () => {
    const verdicts = MOCK_CLASSIFICATIONS.map((mock) => decideVerdict(mock, thresholds));
    expect(verdicts).toEqual(['approved', 'approved', 'needs_review', 'rejected', 'rejected']);
  });
});
