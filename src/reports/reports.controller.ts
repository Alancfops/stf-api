import { Controller, Param, ParseUUIDPipe, Post, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { AdminAuditService } from '../admin/admin-audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTherapist } from '../common/decorators/current-therapist.decorator';
import { toContentDispositionValue } from './report-filename.util';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    private readonly audit: AdminAuditService,
  ) {}

  @Post('assessments/:assessmentId')
  @ApiOperation({ summary: 'RF013 — Gera relatório PDF da avaliação finalizada' })
  @ApiProduces('application/pdf')
  async generateAssessmentReport(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
    @Res() response: Response,
  ) {
    const { pdf, filename } = await this.reportsService.generateAssessmentReport(
      therapist.therapistId,
      assessmentId,
    );

    await this.audit.logReportDownload(therapist.therapistId, assessmentId);

    response.status(201);
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', toContentDispositionValue(filename));
    response.send(pdf);
  }
}
