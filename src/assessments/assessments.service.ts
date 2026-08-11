import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common';
import { AssessmentStatus, Prisma } from '@prisma/client';

import {
  InstrumentCode,
  isImplementedInstrumentCode,
  normalizeInstrumentCode,
} from '../common/constants/instruments';
import type { SchoolingBand } from '../common/constants/schooling-band';
import { PrismaService } from '../prisma/prisma.service';
import { getInstrumentHandler, InstrumentPayloadError } from './instruments/registry';
import {
  assertDraftInstrumentSupported,
  CreateDraftInput,
  UpdateDraftInput,
} from './schemas/assessment.schemas';

type AssessmentResultResponse = {
  rawValue: number;
  rawLabel: string;
  classificationLabel: string;
  classificationCode: string;
  classificationMeta: Record<string, unknown>;
  computedAt: string;
};

export type AssessmentResponse = {
  id: string;
  patientId: string;
  instrumentCode: string;
  status: AssessmentStatus;
  startedAt: string;
  finalizedAt: string | null;
  payload: Record<string, unknown>;
  schoolingBandUsed: string | null;
  notesObservation: string | null;
  result: AssessmentResultResponse | null;
};

export type FinalizeAssessmentResponse = AssessmentResponse & {
  delta: {
    previousAssessmentId: string;
    rawValueDelta: number;
  } | null;
};

export type TimeseriesPoint = {
  assessmentId: string;
  startedAt: string;
  finalizedAt: string;
  rawValue: number;
  rawLabel: string;
  classificationLabel: string;
  classificationCode: string;
};

export type RecentActivityItem = {
  id: string;
  patientId: string;
  patientName: string;
  patientGender: string;
  instrumentCode: string;
  instrumentDisplayName: string;
  finalizedAt: string;
  resultSummary: string;
};

export type TimeseriesResponse = {
  instrumentCode: InstrumentCode;
  points: TimeseriesPoint[];
  canShowChart: boolean;
};

@Injectable()
export class AssessmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(therapistId: string, input: CreateDraftInput): Promise<AssessmentResponse> {
    const support = assertDraftInstrumentSupported(input.instrumentCode);
    if (!support.supported) {
      throw new NotImplementedException(support.message);
    }

    await this.assertPatientOwned(therapistId, input.patientId);

    const assessment = await this.prisma.assessment.create({
      data: {
        therapistId,
        patientId: input.patientId,
        instrumentCode: input.instrumentCode,
        schoolingBandUsed: input.schoolingBandUsed,
        notesObservation: input.notesObservation,
        payload: {},
      },
      include: { result: true },
    });

    return this.toResponse(assessment);
  }

  async updateDraft(
    therapistId: string,
    assessmentId: string,
    input: UpdateDraftInput,
  ): Promise<AssessmentResponse> {
    const assessment = await this.findOwnedAssessment(therapistId, assessmentId);

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new ConflictException('Avaliação já finalizada e não pode ser alterada.');
    }

    const currentPayload = this.asRecord(assessment.payload);
    const nextPayload =
      input.payload === undefined ? currentPayload : { ...currentPayload, ...input.payload };

    const updated = await this.prisma.assessment.update({
      where: { id: assessmentId },
      data: {
        payload: nextPayload as Prisma.InputJsonValue,
        ...(input.schoolingBandUsed !== undefined
          ? { schoolingBandUsed: input.schoolingBandUsed }
          : {}),
        ...(input.notesObservation !== undefined
          ? { notesObservation: input.notesObservation }
          : {}),
      },
      include: { result: true },
    });

    return this.toResponse(updated);
  }

  async finalize(therapistId: string, assessmentId: string): Promise<FinalizeAssessmentResponse> {
    const assessment = await this.findOwnedAssessment(therapistId, assessmentId);

    if (assessment.status !== AssessmentStatus.DRAFT) {
      throw new ConflictException('Avaliação já finalizada.');
    }

    const instrumentCode = assessment.instrumentCode as InstrumentCode;
    if (!isImplementedInstrumentCode(instrumentCode)) {
      throw new NotImplementedException('Instrumento ainda não implementado no servidor.');
    }

    const handler = getInstrumentHandler(instrumentCode);

    let parsedPayload: Record<string, unknown>;
    try {
      parsedPayload = handler.parsePayload(assessment.payload) as Record<string, unknown>;
    } catch (error) {
      if (error instanceof InstrumentPayloadError) {
        throw new BadRequestException({
          statusCode: 400,
          message: `Payload inválido para instrumento ${instrumentCode}.`,
          details: error.details,
        });
      }
      throw error;
    }

    const schoolingBandUsed = assessment.schoolingBandUsed as SchoolingBand | null;

    if (instrumentCode === 'MEEM' && !schoolingBandUsed) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Payload inválido para instrumento MEEM.',
        details: [
          {
            path: 'schoolingBandUsed',
            issue: 'Informe a escolaridade efetiva da sessão MEEM.',
          },
        ],
      });
    }

    const rawValue = handler.score(parsedPayload, { schoolingBandUsed });

    let classification;
    try {
      classification = handler.classify(rawValue, { schoolingBandUsed });
    } catch (error) {
      if (error instanceof InstrumentPayloadError) {
        throw new BadRequestException({
          statusCode: 400,
          message: `Payload inválido para instrumento ${instrumentCode}.`,
          details: error.details,
        });
      }
      throw error;
    }

    const previous = await this.prisma.assessment.findFirst({
      where: {
        therapistId,
        patientId: assessment.patientId,
        instrumentCode,
        status: AssessmentStatus.FINALIZED,
        id: { not: assessmentId },
      },
      orderBy: { finalizedAt: 'desc' },
      include: { result: true },
    });

    const finalized = await this.prisma.$transaction(async (tx) => {
      const updatedAssessment = await tx.assessment.update({
        where: { id: assessmentId },
        data: {
          status: AssessmentStatus.FINALIZED,
          finalizedAt: new Date(),
        },
      });

      await tx.assessmentResult.create({
        data: {
          assessmentId,
          rawValue,
          rawLabel: classification.rawLabel,
          classificationLabel: classification.classificationLabel,
          classificationCode: classification.classificationCode,
          classificationMeta: classification.classificationMeta as Prisma.InputJsonValue,
        },
      });

      return updatedAssessment;
    });

    const withResult = await this.prisma.assessment.findUniqueOrThrow({
      where: { id: finalized.id },
      include: { result: true },
    });

    const response = this.toResponse(withResult);
    const delta =
      previous?.result !== null && previous?.result !== undefined
        ? {
            previousAssessmentId: previous.id,
            rawValueDelta: rawValue - Number(previous.result.rawValue),
          }
        : null;

    return { ...response, delta };
  }

  async getTimeseries(
    therapistId: string,
    patientId: string,
    instrumentCodeInput: string,
  ): Promise<TimeseriesResponse> {
    const instrumentCode = normalizeInstrumentCode(instrumentCodeInput);
    if (!instrumentCode) {
      throw new BadRequestException('Instrumento inválido.');
    }

    await this.assertPatientOwned(therapistId, patientId);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        therapistId,
        patientId,
        instrumentCode,
        status: AssessmentStatus.FINALIZED,
        result: { isNot: null },
      },
      orderBy: { finalizedAt: 'asc' },
      include: { result: true },
    });

    const points: TimeseriesPoint[] = assessments
      .filter((item) => item.result && item.finalizedAt)
      .map((item) => ({
        assessmentId: item.id,
        startedAt: item.startedAt.toISOString(),
        finalizedAt: item.finalizedAt!.toISOString(),
        rawValue: Number(item.result!.rawValue),
        rawLabel: item.result!.rawLabel,
        classificationLabel: item.result!.classificationLabel,
        classificationCode: item.result!.classificationCode,
      }));

    return {
      instrumentCode,
      points,
      canShowChart: points.length >= 2,
    };
  }

  async listRecent(
    therapistId: string,
    query: { limit?: number; search?: string; instrumentCode?: InstrumentCode[] },
  ) {
    const safeLimit = Math.min(Math.max(query.limit ?? 10, 1), 50);
    const search = query.search?.trim();

    const assessments = await this.prisma.assessment.findMany({
      where: {
        therapistId,
        status: AssessmentStatus.FINALIZED,
        result: { isNot: null },
        finalizedAt: { not: null },
        ...(query.instrumentCode?.length
          ? { instrumentCode: { in: query.instrumentCode } }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  patient: {
                    fullName: { contains: search, mode: 'insensitive' },
                  },
                },
                {
                  instrument: {
                    displayName: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: { finalizedAt: 'desc' },
      take: safeLimit,
      include: {
        patient: { select: { id: true, fullName: true, gender: true } },
        instrument: { select: { displayName: true } },
        result: true,
      },
    });

    return {
      data: assessments.map(
        (assessment): RecentActivityItem => ({
          id: assessment.id,
          patientId: assessment.patientId,
          patientName: assessment.patient.fullName,
          patientGender: assessment.patient.gender,
          instrumentCode: assessment.instrumentCode,
          instrumentDisplayName: assessment.instrument.displayName,
          finalizedAt: assessment.finalizedAt!.toISOString(),
          resultSummary: assessment.result!.rawLabel,
        }),
      ),
    };
  }

  async listByPatient(therapistId: string, patientId: string) {
    await this.assertPatientOwned(therapistId, patientId);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        therapistId,
        patientId,
        status: AssessmentStatus.FINALIZED,
        result: { isNot: null },
      },
      orderBy: { finalizedAt: 'desc' },
      include: {
        result: true,
        instrument: true,
      },
    });

    return {
      data: assessments.map((assessment) => ({
        id: assessment.id,
        instrumentCode: assessment.instrumentCode,
        instrumentDisplayName: assessment.instrument.displayName,
        finalizedAt: assessment.finalizedAt?.toISOString() ?? assessment.startedAt.toISOString(),
        result: assessment.result
          ? {
              rawValue: Number(assessment.result.rawValue),
              rawLabel: assessment.result.rawLabel,
              classificationLabel: assessment.result.classificationLabel,
              classificationCode: assessment.result.classificationCode,
            }
          : null,
      })),
    };
  }

  async findByPatientAndId(therapistId: string, patientId: string, assessmentId: string) {
    await this.assertPatientOwned(therapistId, patientId);

    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        therapistId,
        patientId,
        status: AssessmentStatus.FINALIZED,
      },
      include: { result: true, instrument: true },
    });

    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    const timeseries = await this.getTimeseries(
      therapistId,
      patientId,
      assessment.instrumentCode,
    );

    return {
      ...this.toResponse(assessment),
      instrumentDisplayName: assessment.instrument.displayName,
      timeseries,
    };
  }

  private async assertPatientOwned(therapistId: string, patientId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: patientId, therapistId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
  }

  private async findOwnedAssessment(therapistId: string, assessmentId: string) {
    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, therapistId },
      include: { result: true },
    });

    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    return assessment;
  }

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private toResponse(assessment: {
    id: string;
    patientId: string;
    instrumentCode: string;
    status: AssessmentStatus;
    startedAt: Date;
    finalizedAt: Date | null;
    payload: Prisma.JsonValue;
    schoolingBandUsed: string | null;
    notesObservation: string | null;
    result: {
      rawValue: Prisma.Decimal;
      rawLabel: string;
      classificationLabel: string;
      classificationCode: string;
      classificationMeta: Prisma.JsonValue;
      computedAt: Date;
    } | null;
  }): AssessmentResponse {
    return {
      id: assessment.id,
      patientId: assessment.patientId,
      instrumentCode: assessment.instrumentCode,
      status: assessment.status,
      startedAt: assessment.startedAt.toISOString(),
      finalizedAt: assessment.finalizedAt?.toISOString() ?? null,
      payload: this.asRecord(assessment.payload),
      schoolingBandUsed: assessment.schoolingBandUsed,
      notesObservation: assessment.notesObservation,
      result: assessment.result
        ? {
            rawValue: Number(assessment.result.rawValue),
            rawLabel: assessment.result.rawLabel,
            classificationLabel: assessment.result.classificationLabel,
            classificationCode: assessment.result.classificationCode,
            classificationMeta: assessment.result.classificationMeta as Record<string, unknown>,
            computedAt: assessment.result.computedAt.toISOString(),
          }
        : null,
    };
  }
}
