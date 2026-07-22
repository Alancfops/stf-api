import { classifyTug, parseTugPayload, scoreTug } from './schema.zod';

describe('TUG scorer', () => {
  it('calcula média aritmética de 3 ensaios', () => {
    const payload = parseTugPayload({ trial1Sec: 11, trial2Sec: 12, trial3Sec: 13 });
    expect(scoreTug(payload)).toBe(12);
    expect(classifyTug(12).classificationCode).toBe('TUG_EXPECTED');
  });

  it('classifica abaixo de 10 segundos', () => {
    expect(classifyTug(9.5).classificationCode).toBe('TUG_EXCELLENT');
  });

  it('rejeita tempo zero ou negativo', () => {
    expect(() => parseTugPayload({ trial1Sec: 0, trial2Sec: 12, trial3Sec: 13 })).toThrow();
  });
});
