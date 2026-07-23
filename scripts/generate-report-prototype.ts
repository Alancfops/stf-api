import { writeFileSync } from 'fs';
import { join } from 'path';

import { buildReportPdf } from '../src/reports/report-pdf.builder';
import {
  createSampleReportPdfData,
  createSampleReportPdfDataWithoutChart,
} from '../src/reports/report-pdf.sample-data';

async function main() {
  const outputDir = join(process.cwd(), 'output');

  const withCrefito = await buildReportPdf(createSampleReportPdfData({ includeCrefito: true }));
  const withoutCrefito = await buildReportPdf(createSampleReportPdfData({ includeCrefito: false }));
  const meemSingle = await buildReportPdf(createSampleReportPdfDataWithoutChart());

  const withCrefitoPath = join(outputDir, 'report-prototype-com-crefito.pdf');
  const withoutCrefitoPath = join(outputDir, 'report-prototype-sem-crefito.pdf');
  const meemSinglePath = join(outputDir, 'report-prototype-meem-single.pdf');

  writeFileSync(withCrefitoPath, withCrefito);
  writeFileSync(withoutCrefitoPath, withoutCrefito);
  writeFileSync(meemSinglePath, meemSingle);

  console.log('Protótipos gerados:');
  console.log(`  ${withCrefitoPath}`);
  console.log(`  ${withoutCrefitoPath}`);
  console.log(`  ${meemSinglePath}`);
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
