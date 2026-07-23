import type { ReportPdfData } from './report-pdf.types';

type SampleReportOptions = {
  includeCrefito?: boolean;
};

/** Dados fictícios alinhados ao molde clínico em `output/modelo_relatorio_*.pdf`. */
export function createSampleReportPdfData(options: SampleReportOptions = {}): ReportPdfData {
  const { includeCrefito = true } = options;

  return {
    therapistName: 'Maria Fernanda Souza',
    therapistCrefito: includeCrefito ? '123456-F' : null,
    issueLocation: 'Maceió',
    issuedAtDateLabel: '23/07/2026',
    issuedAtTimeLabel: '15:40:00',
    patient: {
      fullName: 'Albertino Silva',
      age: 78,
      genderLabel: 'Masculino',
      schoolingLabel: '5 a 8 anos de estudo',
    },
    assessment: {
      instrumentName: 'TUG (Timed Up and Go)',
      instrumentAuthors: ['Podsiadlo D. & Richardson S., 1991'],
      sessionDateLabel: '22/07/2026',
      sessionTimeLabel: '14:32',
      rawLabel: 'Tempo: 12,5 s',
      resultDetailLabel: '12,5 segundos',
      classificationLabel: 'Normal / Baixo Risco',
      referenceLabel: 'TUG < 10 s = Normal; 10–20 s = Risco Moderado; > 20 s = Risco Elevado',
      interpretation:
        'Tempo dentro da faixa esperada para adultos independentes. Baixo risco funcional para locomoção. Recomenda-se monitoramento longitudinal.',
      notesObservation: null,
    },
    evolution: {
      canShowChart: true,
      yAxisLabel: 'Tempo (s)',
      instrumentCode: 'tug',
      points: [
        {
          dateLabel: '10/06/26',
          rawValue: 15.2,
          rawLabel: '15,2 s',
          classificationLabel: 'Limítrofe',
        },
        {
          dateLabel: '08/07/26',
          rawValue: 13.8,
          rawLabel: '13,8 s',
          classificationLabel: 'Normal',
        },
        {
          dateLabel: '22/07/26',
          rawValue: 12.5,
          rawLabel: '12,5 s',
          classificationLabel: 'Normal',
          isCurrent: true,
        },
      ],
    },
    generatedAtLabel: '23/07/2026 15:40:00',
  };
}

/** Variante sem gráfico — mensagem RF013 quando há apenas uma avaliação. */
export function createSampleReportPdfDataWithoutChart(): ReportPdfData {
  const base = createSampleReportPdfData();

  return {
    ...base,
    assessment: {
      ...base.assessment,
      instrumentName: 'Mini Exame do Estado Mental (MEEM)',
      instrumentAuthors: ['Folstein M.F. et al., 1975'],
      rawLabel: 'Pontuação: 24/30',
      resultDetailLabel: '24 pontos',
      classificationLabel: 'Normal',
      referenceLabel: 'Corte Brucki para 5 a 8 anos de estudo: 18 pontos',
      interpretation:
        'Pontuação acima do corte Brucki para a faixa de escolaridade utilizada na sessão (5 a 8 anos de estudo).',
      notesObservation: null,
    },
    evolution: {
      canShowChart: false,
      yAxisLabel: 'Pontuação (0–30)',
      instrumentCode: 'meem',
      points: [
        {
          dateLabel: '22/07/26',
          rawValue: 24,
          rawLabel: '24/30',
          classificationLabel: 'Normal',
          isCurrent: true,
        },
      ],
    },
  };
}
