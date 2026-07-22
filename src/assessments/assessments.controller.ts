import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTherapist } from '../common/decorators/current-therapist.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AssessmentsService } from './assessments.service';
import { createDraftSchema, listRecentAssessmentsQuerySchema, updateDraftSchema } from './schemas/assessment.schemas';

@ApiTags('assessments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assessments')
export class AssessmentsController {
  constructor(private readonly assessmentsService: AssessmentsService) {}

  @Get('recent')
  @ApiOperation({ summary: 'RF005 — Atividades recentes do fisioterapeuta autenticado' })
  listRecent(
    @CurrentTherapist() therapist: { therapistId: string },
    @Query(new ZodValidationPipe(listRecentAssessmentsQuerySchema))
    query: z.infer<typeof listRecentAssessmentsQuerySchema>,
  ) {
    return this.assessmentsService.listRecent(therapist.therapistId, query);
  }

  @Post('draft')
  @HttpCode(201)
  @ApiOperation({ summary: 'RF008–RF011 — Cria avaliação em rascunho' })
  createDraft(
    @CurrentTherapist() therapist: { therapistId: string },
    @Body(new ZodValidationPipe(createDraftSchema)) body: z.infer<typeof createDraftSchema>,
  ) {
    return this.assessmentsService.createDraft(therapist.therapistId, body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'RF010 — Atualiza payload parcial enquanto DRAFT' })
  updateDraft(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateDraftSchema)) body: z.infer<typeof updateDraftSchema>,
  ) {
    return this.assessmentsService.updateDraft(therapist.therapistId, id, body);
  }

  @Post(':id/finalize')
  @HttpCode(201)
  @ApiOperation({ summary: 'RF011 — Finaliza avaliação, calcula score e persiste resultado' })
  finalize(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assessmentsService.finalize(therapist.therapistId, id);
  }
}
