import { Module } from '@nestjs/common';

import { AdminAuditService } from '../admin/admin-audit.service';

/** Módulo compartilhado para evitar ciclo Admin ↔ Reports. */
@Module({
  providers: [AdminAuditService],
  exports: [AdminAuditService],
})
export class AuditModule {}
