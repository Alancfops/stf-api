import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssessmentStatus } from '@prisma/client';

import { AssessmentsService } from '../assessments/assessments.service';
import { PrismaService } from '../prisma/prisma.service';
import { buildReportPdf } from './report-pdf.builder';
import { buildAssessmentReportFilename } from './report-filename.util';
import { assertFinalizedAssessment, mapAssessmentToReportPdfData } from './report-pdf.mapper';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly assessmentsService: AssessmentsService,
  ) {}

  async generateAssessmentReport(
    therapistId: string,
    assessmentId: string,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        therapistId,
        status: AssessmentStatus.FINALIZED,
        result: { isNot: null },
        finalizedAt: { not: null },
      },
      include: {
        result: true,
        instrument: true,
        patient: true,
        therapist: { select: { fullName: true } },
      },
    });

    if (!assessment || !assessment.result || !assessment.finalizedAt) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    try {
      assertFinalizedAssessment(assessment.status);
    } catch {
      throw new BadRequestException('Somente avaliações finalizadas geram relatório.');
    }

    const timeseries = await this.assessmentsService.getTimeseriesForPatient(
      assessment.patientId,
      assessment.instrumentCode,
    );

    const reportData = mapAssessmentToReportPdfData(
      {
        ...assessment,
        payload: assessment.payload,
        result: assessment.result,
      },
      timeseries,
      new Date(),
    );

    // RF013 / LGPD: PDF gerado on-the-fly; sem persistência em disco/S3 no MVP.
    const pdf = await buildReportPdf(reportData);
    const filename = buildAssessmentReportFilename(assessment.patient.fullName);

    return { pdf, filename };
  }

  async generateAssessmentReportForAdmin(
    assessmentId: string,
  ): Promise<{ pdf: Buffer; filename: string }> {
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        status: AssessmentStatus.FINALIZED,
        result: { isNot: null },
        finalizedAt: { not: null },
      },
      include: {
        result: true,
        instrument: true,
        patient: true,
        therapist: { select: { fullName: true } },
      },
    });

    if (!assessment || !assessment.result || !assessment.finalizedAt) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    try {
      assertFinalizedAssessment(assessment.status);
    } catch {
      throw new BadRequestException('Somente avaliações finalizadas geram relatório.');
    }

    const timeseries = await this.assessmentsService.getTimeseriesForPatient(
      assessment.patientId,
      assessment.instrumentCode,
    );

    const reportData = mapAssessmentToReportPdfData(
      {
        ...assessment,
        payload: assessment.payload,
        result: assessment.result,
      },
      timeseries,
      new Date(),
    );

    const pdf = await buildReportPdf(reportData);
    const filename = buildAssessmentReportFilename(assessment.patient.fullName);

    return { pdf, filename };
  }
}
