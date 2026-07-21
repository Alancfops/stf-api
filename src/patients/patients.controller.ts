import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTherapist } from '../common/decorators/current-therapist.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import {
  createPatientSchema,
  listPatientsQuerySchema,
} from './schemas/patient.schemas';
import { PatientsService } from './patients.service';

@ApiTags('patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Get()
  @ApiOperation({ summary: 'RF005 — Lista pacientes do fisioterapeuta autenticado' })
  list(
    @CurrentTherapist() therapist: { therapistId: string },
    @Query(new ZodValidationPipe(listPatientsQuerySchema)) query: z.infer<typeof listPatientsQuerySchema>,
  ) {
    return this.patientsService.list(therapist.therapistId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'RF006 — Perfil do paciente (escopo do fisioterapeuta autenticado)' })
  findOne(
    @CurrentTherapist() therapist: { therapistId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.patientsService.findById(therapist.therapistId, id);
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
