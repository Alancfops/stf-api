const INVALID_FILENAME_CHARS = /[/\\:*?"<>|]/g;

export function buildAssessmentReportFilename(patientFullName: string): string {
  const cleaned = patientFullName
    .trim()
    .replace(INVALID_FILENAME_CHARS, '')
    .replace(/\s+/g, ' ')
    .slice(0, 100);

  const name = cleaned || 'Paciente';
  return `Relatório - ${name}.pdf`;
}

/** RFC 5987 — nome legível com acentos + fallback ASCII para clientes antigos. */
export function toContentDispositionValue(filename: string): string {
  const asciiFallback = filename
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return `inline; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
