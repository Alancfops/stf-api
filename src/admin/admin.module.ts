import { Module } from '@nestjs/common';

import { AssessmentsModule } from '../assessments/assessments.module';
import { AuthModule } from '../auth/auth.module';
import { ReportsModule } from '../reports/reports.module';
import { AdminAuditService } from './admin-audit.service';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, AssessmentsModule, ReportsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuditService, AdminGuard],
})
export class AdminModule {}
