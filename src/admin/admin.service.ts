import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  AdminAccessRequestStatus,
  AdminAuditAction,
  AssessmentStatus,
  Prisma,
  TherapistRole,
} from '@prisma/client';

import { AssessmentsService } from '../assessments/assessments.service';
import { generateTempPassword, hashPassword } from '../auth/auth.crypto';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import {
  ListAccessRequestsQuery,
  ListAuditLogsQuery,
  ListPatientAssessmentsQuery,
  ListTherapistsQuery,
  TransferPatientInput,
} from './schemas/admin.schemas';

/** Roles que ADMIN (professora) pode ver/gerenciar. */
const ADMIN_SCOPED_ROLES: TherapistRole[] = [TherapistRole.ASSISTANT, TherapistRole.THERAPIST];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AdminAuditService,
    private readonly assessmentsService: AssessmentsService,
    private readonly notifications: NotificationsService,
  ) {}

  async listTherapists(query: ListTherapistsQuery, requesterRole: TherapistRole) {
    const search = query.search?.trim();

    let roleFilter: Prisma.TherapistWhereInput['role'];
    if (requesterRole === TherapistRole.ADMIN) {
      if (query.role && !ADMIN_SCOPED_ROLES.includes(query.role)) {
        throw new ForbiddenException('Fora do escopo de gestão desta conta.');
      }
      roleFilter = query.role ?? { in: ADMIN_SCOPED_ROLES };
    } else {
      if (query.role && query.role !== TherapistRole.THERAPIST) {
        throw new ForbiddenException('Fora do escopo de gestão desta conta.');
      }
      roleFilter = TherapistRole.THERAPIST;
    }

    const where: Prisma.TherapistWhereInput = {
      ...(search
        ? {
            OR: [
              { fullName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(roleFilter !== undefined ? { role: roleFilter } : {}),
    };

    const [total, therapists] = await Promise.all([
      this.prisma.therapist.count({ where }),
      this.prisma.therapist.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: {
            select: {
              patients: true,
              assessments: { where: { status: AssessmentStatus.FINALIZED } },
            },
          },
          assessments: {
            where: { status: AssessmentStatus.FINALIZED, finalizedAt: { not: null } },
            orderBy: { finalizedAt: 'desc' },
            take: 1,
            select: { finalizedAt: true },
          },
        },
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    return {
      data: therapists.map((therapist) => ({
        id: therapist.id,
        fullName: therapist.fullName,
        email: therapist.email,
        role: therapist.role,
        createdAt: therapist.createdAt.toISOString(),
        patientCount: therapist._count.patients,
        assessmentCount: therapist._count.assessments,
        lastActivityAt: therapist.assessments[0]?.finalizedAt?.toISOString() ?? null,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getTherapist(id: string, requesterRole: TherapistRole) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            patients: true,
            assessments: { where: { status: AssessmentStatus.FINALIZED } },
          },
        },
        patients: {
          orderBy: { fullName: 'asc' },
          include: {
            _count: {
              select: {
                assessments: { where: { status: AssessmentStatus.FINALIZED } },
              },
            },
            assessments: {
              where: { status: AssessmentStatus.FINALIZED, finalizedAt: { not: null } },
              orderBy: { finalizedAt: 'desc' },
              take: 1,
              select: { finalizedAt: true },
            },
          },
        },
      },
    });

    if (!therapist) {
      throw new NotFoundException('Fisioterapeuta não encontrado.');
    }

    this.assertTherapistInScope(therapist.role, requesterRole);

    return {
      id: therapist.id,
      fullName: therapist.fullName,
      email: therapist.email,
      role: therapist.role,
      createdAt: therapist.createdAt.toISOString(),
      patients: therapist.patients.map((patient) => ({
        id: patient.id,
        fullName: patient.fullName,
        age: patient.age,
        gender: patient.gender,
        assessmentCount: patient._count.assessments,
        lastAssessmentAt: patient.assessments[0]?.finalizedAt?.toISOString() ?? null,
      })),
      meta: {
        patientCount: therapist._count.patients,
        assessmentCount: therapist._count.assessments,
      },
    };
  }

  async deleteTherapist(
    adminId: string,
    id: string,
    requesterRole: TherapistRole,
  ): Promise<void> {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id },
      include: { _count: { select: { patients: true } } },
    });

    if (!therapist) {
      throw new NotFoundException('Fisioterapeuta não encontrado.');
    }

    this.assertTherapistInScope(therapist.role, requesterRole);

    if (therapist._count.patients > 0) {
      throw new ConflictException(
        `Este fisioterapeuta ainda possui ${therapist._count.patients} paciente(s). Transfira ou exclua os pacientes antes de remover a conta.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.therapist.delete({ where: { id } });
      await this.audit.log(
        adminId,
        AdminAuditAction.DELETE_THERAPIST,
        'Therapist',
        id,
        {
          therapistName: therapist.fullName,
          fullName: therapist.fullName,
          email: therapist.email,
        },
        tx,
      );
    });
  }

  async getPatient(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      include: {
        therapist: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    return {
      id: patient.id,
      fullName: patient.fullName,
      age: patient.age,
      gender: patient.gender,
      contact: patient.contact,
      schoolingBand: patient.schoolingBand,
      avatarUrl: patient.avatarUrl,
      createdAt: patient.createdAt.toISOString(),
      therapist: patient.therapist,
    };
  }

  async listPatientAssessments(patientId: string, query: ListPatientAssessmentsQuery) {
    await this.assertPatientExists(patientId);

    const assessments = await this.prisma.assessment.findMany({
      where: {
        patientId,
        status: AssessmentStatus.FINALIZED,
        ...(query.instrumentCode ? { instrumentCode: query.instrumentCode } : {}),
      },
      include: {
        result: true,
        therapist: { select: { id: true, fullName: true } },
      },
    });

    assessments.sort((a, b) => {
      const aDate = (a.finalizedAt ?? a.startedAt).getTime();
      const bDate = (b.finalizedAt ?? b.startedAt).getTime();
      return bDate - aDate;
    });

    return {
      data: assessments.map((assessment) => this.toAdminAssessmentSummary(assessment)),
    };
  }

  async getPatientAssessment(patientId: string, assessmentId: string) {
    await this.assertPatientExists(patientId);

    const assessment = await this.prisma.assessment.findFirst({
      where: { id: assessmentId, patientId },
      include: {
        result: true,
        therapist: { select: { id: true, fullName: true } },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Avaliação não encontrada.');
    }

    return this.toAdminAssessmentDetail(assessment);
  }

  async getPatientTimeseries(patientId: string, codeInput: string) {
    await this.assertPatientExists(patientId);
    return this.assessmentsService.getTimeseriesForPatient(patientId, codeInput);
  }

  async deletePatient(adminId: string, patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, fullName: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.patient.delete({ where: { id: patientId } });
      await this.audit.log(
        adminId,
        AdminAuditAction.DELETE_PATIENT,
        'Patient',
        patientId,
        { patientName: patient.fullName },
        tx,
      );
    });
  }

  async transferPatient(adminId: string, patientId: string, input: TransferPatientInput) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, therapistId: true, fullName: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }

    if (patient.therapistId === input.targetTherapistId) {
      throw new BadRequestException('O paciente já pertence a este fisioterapeuta.');
    }

    const targetTherapist = await this.prisma.therapist.findUnique({
      where: { id: input.targetTherapistId },
      select: { id: true },
    });

    if (!targetTherapist) {
      throw new NotFoundException('Fisioterapeuta de destino não encontrado.');
    }

    const fromTherapistId = patient.therapistId;

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.patient.update({
        where: { id: patientId },
        data: { therapistId: input.targetTherapistId },
      });

      const assessmentsUpdated = await tx.assessment.updateMany({
        where: { patientId },
        data: { therapistId: input.targetTherapistId },
      });

      await this.audit.log(
        adminId,
        AdminAuditAction.TRANSFER_PATIENT,
        'Patient',
        patientId,
        {
          patientName: patient.fullName,
          fromTherapistId,
          toTherapistId: input.targetTherapistId,
        },
        tx,
      );

      return { updated, assessmentsUpdated: assessmentsUpdated.count };
    });

    return {
      patientId: result.updated.id,
      fromTherapistId,
      toTherapistId: input.targetTherapistId,
      assessmentsUpdated: result.assessmentsUpdated,
    };
  }

  async listAuditLogs(query: ListAuditLogsQuery) {
    const where: Prisma.AdminAuditLogWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.adminId ? { adminId: query.adminId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: new Date(query.from) } : {}),
              ...(query.to ? { lte: new Date(query.to) } : {}),
            },
          }
        : {}),
    };

    const [total, logs] = await Promise.all([
      this.prisma.adminAuditLog.count({ where }),
      this.prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          admin: { select: { fullName: true } },
        },
      }),
    ]);

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    const downloadLogsMissingMeta = logs.filter((log) => {
      if (log.action !== AdminAuditAction.DOWNLOAD_REPORT) return false;
      const meta = log.metadata as Record<string, unknown>;
      return !meta.patientName || !meta.instrumentCode || !meta.patientId;
    });

    const assessmentById = new Map<
      string,
      {
        patientId: string;
        patientName: string;
        instrumentCode: string;
        finalizedAt: string | null;
      }
    >();

    if (downloadLogsMissingMeta.length > 0) {
      const assessments = await this.prisma.assessment.findMany({
        where: { id: { in: downloadLogsMissingMeta.map((log) => log.targetId) } },
        select: {
          id: true,
          instrumentCode: true,
          finalizedAt: true,
          patient: { select: { id: true, fullName: true } },
        },
      });
      for (const assessment of assessments) {
        assessmentById.set(assessment.id, {
          patientId: assessment.patient.id,
          patientName: assessment.patient.fullName,
          instrumentCode: assessment.instrumentCode,
          finalizedAt: assessment.finalizedAt?.toISOString() ?? null,
        });
      }
    }

    const patientLogsMissingName = logs.filter((log) => {
      if (log.targetType !== 'Patient') return false;
      const meta = log.metadata as Record<string, unknown>;
      return !meta.patientName;
    });

    const patientNameById = new Map<string, string>();
    if (patientLogsMissingName.length > 0) {
      const patients = await this.prisma.patient.findMany({
        where: { id: { in: patientLogsMissingName.map((log) => log.targetId) } },
        select: { id: true, fullName: true },
      });
      for (const patient of patients) {
        patientNameById.set(patient.id, patient.fullName);
      }
    }

    return {
      data: logs.map((log) => {
        let metadata = log.metadata as Record<string, unknown>;
        if (log.action === AdminAuditAction.DOWNLOAD_REPORT) {
          const fallback = assessmentById.get(log.targetId);
          if (fallback) {
            metadata = {
              ...metadata,
              patientId: metadata.patientId ?? fallback.patientId,
              patientName: metadata.patientName ?? fallback.patientName,
              instrumentCode: metadata.instrumentCode ?? fallback.instrumentCode,
              finalizedAt: metadata.finalizedAt ?? fallback.finalizedAt,
            };
          }
        }

        if (log.targetType === 'Patient' && !metadata.patientName) {
          const name = patientNameById.get(log.targetId);
          if (name) {
            metadata = { ...metadata, patientName: name };
          }
        }

        return {
          id: log.id,
          adminId: log.adminId,
          adminName: log.admin.fullName,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          metadata,
          createdAt: log.createdAt.toISOString(),
        };
      }),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async listAccessRequests(
    adminId: string,
    requesterRole: TherapistRole,
    query: ListAccessRequestsQuery,
  ) {
    this.assertCanManageAccessRequests(requesterRole);
    const status = query.status as AdminAccessRequestStatus;
    const requests = await this.prisma.adminAccessRequest.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: {
        resolvedBy: { select: { id: true, fullName: true, email: true } },
      },
    });

    return {
      data: requests.map((request) => ({
        id: request.id,
        email: request.email,
        fullName: request.fullName,
        status: request.status,
        createdAt: request.createdAt.toISOString(),
        resolvedAt: request.resolvedAt?.toISOString() ?? null,
        resolvedBy: request.resolvedBy
          ? {
              id: request.resolvedBy.id,
              fullName: request.resolvedBy.fullName,
              email: request.resolvedBy.email,
            }
          : null,
      })),
    };
  }

  async approveAccessRequest(adminId: string, requestId: string, requesterRole: TherapistRole) {
    this.assertCanManageAccessRequests(requesterRole);

    const request = await this.prisma.adminAccessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    if (request.status !== AdminAccessRequestStatus.PENDING) {
      throw new ConflictException('Esta solicitação já foi resolvida.');
    }

    const existingAssistant = await this.prisma.therapist.findUnique({
      where: {
        email_role: { email: request.email, role: TherapistRole.ASSISTANT },
      },
      select: { id: true },
    });

    if (existingAssistant) {
      throw new ConflictException(
        'Já existe uma conta administrativa com este e-mail. Não é possível aprovar a solicitação.',
      );
    }

    // Conta THERAPIST (mobile) com o mesmo e-mail é permitida — cria ASSISTANT separado.
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const now = new Date();

    const therapist = await this.prisma.$transaction(async (tx) => {
      const created = await tx.therapist.create({
        data: {
          email: request.email,
          fullName: request.fullName,
          passwordHash,
          role: TherapistRole.ASSISTANT,
          mustChangePassword: true,
        },
      });

      await tx.adminAccessRequest.update({
        where: { id: request.id },
        data: {
          status: AdminAccessRequestStatus.APPROVED,
          resolvedAt: now,
          resolvedById: adminId,
        },
      });

      await this.audit.log(
        adminId,
        AdminAuditAction.CREATE_THERAPIST,
        'Therapist',
        created.id,
        { fullName: created.fullName, email: created.email, role: created.role },
        tx,
      );

      return created;
    });

    try {
      await this.notifications.sendAdminTempPasswordEmail(request.email, {
        fullName: request.fullName,
        tempPassword,
      });
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Conta criada, mas não foi possível enviar o e-mail com a senha temporária.',
      );
    }

    return {
      id: therapist.id,
      email: therapist.email,
      fullName: therapist.fullName,
      role: therapist.role,
      mustChangePassword: therapist.mustChangePassword,
      createdAt: therapist.createdAt.toISOString(),
    };
  }

  async rejectAccessRequest(adminId: string, requestId: string, requesterRole: TherapistRole) {
    this.assertCanManageAccessRequests(requesterRole);

    const request = await this.prisma.adminAccessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Solicitação não encontrada.');
    }

    if (request.status !== AdminAccessRequestStatus.PENDING) {
      throw new ConflictException('Esta solicitação já foi resolvida.');
    }

    const updated = await this.prisma.adminAccessRequest.update({
      where: { id: requestId },
      data: {
        status: AdminAccessRequestStatus.REJECTED,
        resolvedAt: new Date(),
        resolvedById: adminId,
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.fullName,
      status: updated.status,
      resolvedAt: updated.resolvedAt!.toISOString(),
    };
  }

  async logReportDownload(adminId: string, assessmentId: string): Promise<void> {
    await this.audit.logReportDownload(adminId, assessmentId);
  }

  private assertCanManageAccessRequests(requesterRole: TherapistRole): void {
    if (requesterRole !== TherapistRole.ADMIN) {
      throw new ForbiddenException(
        'Apenas administradores podem gerenciar solicitações de acesso.',
      );
    }
  }

  /**
   * ADMIN só vê/gerencia ASSISTANT + THERAPIST; ASSISTANT só vê/gerencia THERAPIST.
   * A conta ADMIN nunca é gerenciada pelo painel — só via `npm run admin:set`.
   */
  private assertTherapistInScope(
    targetRole: TherapistRole,
    requesterRole: TherapistRole,
  ): void {
    if (requesterRole === TherapistRole.ADMIN) {
      if (ADMIN_SCOPED_ROLES.includes(targetRole)) {
        return;
      }
      throw new ForbiddenException('Fora do escopo de gestão desta conta.');
    }

    if (targetRole === TherapistRole.THERAPIST) {
      return;
    }
    throw new ForbiddenException('Fora do escopo de gestão desta conta.');
  }

  private async assertPatientExists(patientId: string): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true },
    });

    if (!patient) {
      throw new NotFoundException('Paciente não encontrado.');
    }
  }

  private toAdminAssessmentSummary(assessment: {
    id: string;
    patientId: string;
    instrumentCode: string;
    status: AssessmentStatus;
    startedAt: Date;
    finalizedAt: Date | null;
    therapist: { id: string; fullName: string };
    result: {
      rawValue: Prisma.Decimal;
      rawLabel: string;
      classificationLabel: string;
      classificationCode: string;
      classificationMeta: Prisma.JsonValue;
      computedAt: Date;
    } | null;
  }) {
    return {
      id: assessment.id,
      patientId: assessment.patientId,
      instrumentCode: assessment.instrumentCode,
      status: assessment.status,
      startedAt: assessment.startedAt.toISOString(),
      finalizedAt: assessment.finalizedAt?.toISOString() ?? null,
      therapistId: assessment.therapist.id,
      therapistName: assessment.therapist.fullName,
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

  private toAdminAssessmentDetail(assessment: {
    id: string;
    patientId: string;
    instrumentCode: string;
    status: AssessmentStatus;
    startedAt: Date;
    finalizedAt: Date | null;
    payload: Prisma.JsonValue;
    schoolingBandUsed: string | null;
    notesObservation: string | null;
    therapist: { id: string; fullName: string };
    result: {
      rawValue: Prisma.Decimal;
      rawLabel: string;
      classificationLabel: string;
      classificationCode: string;
      classificationMeta: Prisma.JsonValue;
      computedAt: Date;
    } | null;
  }) {
    return {
      ...this.toAdminAssessmentSummary(assessment),
      payload: this.asRecord(assessment.payload),
      schoolingBandUsed: assessment.schoolingBandUsed,
      notesObservation: assessment.notesObservation,
    };
  }

  private asRecord(value: Prisma.JsonValue): Record<string, unknown> {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }
}
