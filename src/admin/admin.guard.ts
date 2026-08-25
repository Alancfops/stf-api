import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TherapistRole } from '@prisma/client';

import { AuthenticatedTherapist } from '../common/decorators/current-therapist.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedTherapist }>();
    if (request.user?.role !== TherapistRole.ADMIN) {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }
    return true;
  }
}
