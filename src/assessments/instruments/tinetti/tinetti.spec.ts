import { classifyTinetti, parseTinettiPayload, scoreTinetti } from './schema.zod';

describe('Tinetti scorer', () => {
  const maxPayload = {
    tinetti_1: 1,
    tinetti_2: 2,
    tinetti_3: 2,
    tinetti_4: 2,
    tinetti_5: 2,
    tinetti_6: 2,
    tinetti_7: 1,
    tinetti_8: 2,
    tinetti_9: 2,
    tinetti_10: 1,
    tinetti_11: 4,
    tinetti_12: 1,
    tinetti_13: 1,
    tinetti_14: 2,
    tinetti_15: 2,
    tinetti_16: 1,
  };

  it('soma máximo 28', () => {
    const payload = parseTinettiPayload(maxPayload);
    expect(scoreTinetti(payload)).toBe(28);
    expect(classifyTinetti(28).classificationCode).toBe('TINETTI_LOW');
  });

  it('classifica alto risco abaixo de 19', () => {
    expect(classifyTinetti(18).classificationCode).toBe('TINETTI_HIGH');
  });

  it('classifica moderado no limite 19', () => {
    expect(classifyTinetti(19).classificationCode).toBe('TINETTI_MODERATE');
  });

  it('rejeita item acima do máximo', () => {
    expect(() => parseTinettiPayload({ ...maxPayload, tinetti_11: 5 })).toThrow();
  });
});
