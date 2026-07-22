import { classifyKatz, parseKatzPayload, scoreKatz } from './schema.zod';

describe('Katz scorer', () => {
  const basePayload = {
    katz_1: 'independente',
    katz_2: 'independente',
    katz_3: 'independente',
    katz_4: 'independente',
    katz_5: 'independente',
    katz_6: 'independente',
  } as const;

  it('estrato 0 quando nenhum dependente', () => {
    const payload = parseKatzPayload(basePayload);
    expect(scoreKatz(payload)).toBe(0);
    expect(classifyKatz(0).classificationCode).toBe('KATZ_STRATUM_0');
  });

  it('conta apenas dependente (assistência não entra)', () => {
    const payload = parseKatzPayload({
      ...basePayload,
      katz_1: 'dependente',
      katz_2: 'dependente',
      katz_3: 'assistencia',
      katz_4: 'independente',
    });
    expect(scoreKatz(payload)).toBe(2);
  });

  it('estrato 6 com todos dependentes', () => {
    const payload = parseKatzPayload({
      katz_1: 'dependente',
      katz_2: 'dependente',
      katz_3: 'dependente',
      katz_4: 'dependente',
      katz_5: 'dependente',
      katz_6: 'dependente',
    });
    expect(scoreKatz(payload)).toBe(6);
  });

  it('rejeita valor inválido', () => {
    expect(() =>
      parseKatzPayload({
        ...basePayload,
        katz_1: 'invalido',
      }),
    ).toThrow();
  });
});
