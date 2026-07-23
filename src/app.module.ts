import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AssessmentsModule } from './assessments/assessments.module';
import { AuthModule } from './auth/auth.module';
import { validateEnv } from './config/env.schema';
import { HealthModule } from './health/health.module';
import { InstrumentsModule } from './instruments/instruments.module';
import { PatientsModule } from './patients/patients.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    PatientsModule,
    InstrumentsModule,
    AssessmentsModule,
    ReportsModule,
  ],
})
export class AppModule {}
