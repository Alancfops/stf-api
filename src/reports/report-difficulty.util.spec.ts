import { buildReportDifficultyHighlight } from './report-difficulty.util';

describe('buildReportDifficultyHighlight', () => {
  it('resume o item Berg com pior pontuação em uma frase', () => {
    const payload = Object.fromEntries(
      Array.from({ length: 14 }, (_, index) => [`berg_${index + 1}`, index === 0 ? 0 : 4]),
    );

    expect(buildReportDifficultyHighlight('BERG', payload)).toBe(
      'O paciente teve mais dificuldade em Sentado — em pé (0/4).',
    );
  });

  it('menciona até três domínios Katz', () => {
    const text = buildReportDifficultyHighlight('KATZ', {
      katz_1: 'dependente',
      katz_2: 'assistencia',
      katz_3: 'dependente',
      katz_4: 'independente',
      katz_5: 'independente',
      katz_6: 'independente',
    });

    expect(text).toContain('O paciente teve mais dificuldade nos domínios');
    expect(text).toContain('Tomar banho (Dependente)');
    expect(text).toContain('Uso do vaso sanitário (Dependente)');
  });

  it('resume TUG pelo ensaio mais lento', () => {
    expect(
      buildReportDifficultyHighlight('TUG', {
        trial1Sec: 11,
        trial2Sec: 14,
        trial3Sec: 12,
      }),
    ).toBe('O paciente teve mais dificuldade no ensaio 2 (14,0 s).');
  });

  it('informa quando não há dificuldade acentuada', () => {
    const payload = Object.fromEntries(
      Array.from({ length: 14 }, (_, index) => [`berg_${index + 1}`, 4]),
    );

    expect(buildReportDifficultyHighlight('BERG', payload)).toContain('Nenhum item destacado');
  });
});
