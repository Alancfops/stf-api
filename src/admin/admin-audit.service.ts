import { Injectable } from '@nestjs/common';
import { AdminAuditAction, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    adminId: string,
    action: AdminAuditAction,
    targetType: string,
    targetId: string,
    metadata: Record<string, unknown> = {},
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const client = tx ?? this.prisma;
    await client.adminAuditLog.create({
      data: {
        adminId,
        action,
        targetType,
        targetId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }

  /** Registra download de PDF (admin ou fisioterapeuta). */
  async logReportDownload(actorId: string, assessmentId: string): Promise<void> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        instrumentCode: true,
        finalizedAt: true,
        patient: { select: { id: true, fullName: true } },
      },
    });

    await this.log(actorId, AdminAuditAction.DOWNLOAD_REPORT, 'Assessment', assessmentId, {
      patientId: assessment?.patient.id ?? null,
      patientName: assessment?.patient.fullName ?? null,
      instrumentCode: assessment?.instrumentCode ?? null,
      finalizedAt: assessment?.finalizedAt?.toISOString() ?? null,
    });
  }
}
