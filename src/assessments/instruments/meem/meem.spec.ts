import { classifyMeem, parseMeemPayload, scoreMeem } from './schema.zod';

describe('MEEM scorer', () => {
  const zeroPayload = {
    meem_or_1: 0,
    meem_or_2: 0,
    meem_or_3: 0,
    meem_or_4: 0,
    meem_or_5: 0,
    meem_or_6: 0,
    meem_or_7: 0,
    meem_or_8: 0,
    meem_or_9: 0,
    meem_or_10: 0,
    meem_registro: 0,
    meem_atencao: 0,
    meem_evocacao: 0,
    meem_l1: 0,
    meem_l2: 0,
    meem_l3: 0,
    meem_l4: 0,
    meem_l5: 0,
    meem_l6: 0,
  };

  it('soma total 30 no máximo', () => {
    const payload = parseMeemPayload({
      ...zeroPayload,
      meem_or_1: 1,
      meem_or_2: 1,
      meem_or_3: 1,
      meem_or_4: 1,
      meem_or_5: 1,
      meem_or_6: 1,
      meem_or_7: 1,
      meem_or_8: 1,
      meem_or_9: 1,
      meem_or_10: 1,
      meem_registro: 3,
      meem_atencao: 5,
      meem_evocacao: 3,
      meem_l1: 2,
      meem_l2: 1,
      meem_l3: 3,
      meem_l4: 1,
      meem_l5: 1,
      meem_l6: 1,
    });
    expect(scoreMeem(payload)).toBe(30);
  });

  it('classifica abaixo do corte Brucki', () => {
    expect(classifyMeem(24, '1_4_anos').classificationCode).toBe('MEEM_BELOW_CUTOFF');
  });

  it('classifica no/ acima do corte Brucki', () => {
    expect(classifyMeem(25, '1_4_anos').classificationCode).toBe('MEEM_ABOVE_CUTOFF');
  });

  it('rejeita bloco acima do teto', () => {
    expect(() => parseMeemPayload({ ...zeroPayload, meem_registro: 4 })).toThrow();
  });
});
