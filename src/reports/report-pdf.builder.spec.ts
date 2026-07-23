import { buildReportPdf } from './report-pdf.builder';
import { createSampleReportPdfData } from './report-pdf.sample-data';

describe('buildReportPdf', () => {
  it('gera buffer PDF válido com dados de amostra', async () => {
    const buffer = await buildReportPdf(createSampleReportPdfData());

    expect(buffer.length).toBeGreaterThan(500);
    expect(buffer.subarray(0, 4).toString('utf8')).toBe('%PDF');
  });
});
