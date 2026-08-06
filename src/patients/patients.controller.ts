import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { AssessmentsService } from '../assessments/assessments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTherapist } from '../common/decorators/current-therapist.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from './schemas/patient.schemas';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly assessmentsService: AssessmentsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'RF005 — Lista pacientes do fisioterapeuta autenticado' })
  list(
    @CurrentTherapist() therapist: { therapistId: string },
    @Query(new ZodValidationPipe(listPatientsQuerySchema)) query: z.infer<typeof listPatientsQuerySchema>,
  ) {
    return this.patientsService.list(therapist.therapistId, query);
  }

  @Get(':id/assessments/:assessmentId')
  @ApiOperation({ summary: 'RF006 — Detalhe de avaliação do paciente' })
  assessmentDetail(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('assessmentId', ParseUUIDPipe) assessmentId: string,
  ) {
    return this.assessmentsService.findByPatientAndId(therapist.therapistId, id, assessmentId);
  }

  @Get(':id/assessments')
  @ApiOperation({ summary: 'RF006 — Histórico de avaliações do paciente' })
  listAssessments(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.assessmentsService.listByPatient(therapist.therapistId, id);
  }

  @Get(':id/instruments/:code/timeseries')
  @ApiOperation({ summary: 'RF012 — Série temporal de avaliações finalizadas por instrumento' })
  timeseries(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('code') code: string,
  ) {
    return this.assessmentsService.getTimeseries(therapist.therapistId, id, code);
  }

  @Get(':id')
  @ApiOperation({ summary: 'RF006 — Perfil do paciente (escopo do fisioterapeuta autenticado)' })
  findOne(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findById(therapist.therapistId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'RF004 — Atualiza cadastro do paciente (escopo do fisioterapeuta autenticado)' })
  update(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updatePatientSchema)) body: z.infer<typeof updatePatientSchema>,
  ) {
    return this.patientsService.update(therapist.therapistId, id, body);
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'RF004 — Cadastro de paciente (escopo do fisioterapeuta autenticado)' })
  create(
    @CurrentTherapist() therapist: { therapistId: string },
    @Body(new ZodValidationPipe(createPatientSchema)) body: z.infer<typeof createPatientSchema>,
  ) {
    return this.patientsService.create(therapist.therapistId, body);
  }
}
