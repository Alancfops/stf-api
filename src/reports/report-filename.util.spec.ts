import {
  buildAssessmentReportFilename,
  toContentDispositionValue,
} from './report-filename.util';

describe('report-filename.util', () => {
  it('monta nome legível com o paciente', () => {
    expect(buildAssessmentReportFilename('Maria da Silva')).toBe('Relatório - Maria da Silva.pdf');
  });

  it('remove caracteres inválidos do sistema de arquivos', () => {
    expect(buildAssessmentReportFilename('João/Oliveira')).toBe('Relatório - JoãoOliveira.pdf');
  });

  it('gera Content-Disposition com fallback ASCII e UTF-8', () => {
    const header = toContentDispositionValue('Relatório - José.pdf');
    expect(header).toContain('filename="Relatorio - Jose.pdf"');
    expect(header).toContain("filename*=UTF-8''");
    expect(header).toContain(encodeURIComponent('Relatório - José.pdf'));
  });
});
