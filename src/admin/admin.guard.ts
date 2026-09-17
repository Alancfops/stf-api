import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TherapistRole } from '@prisma/client';

import { AuthenticatedTherapist } from '../common/decorators/current-therapist.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedTherapist }>();
    const webRoles: TherapistRole[] = [
      TherapistRole.ASSISTANT,
      TherapistRole.ADMIN,
      TherapistRole.SUPER_ADMIN,
    ];
    if (!request.user?.role || !webRoles.includes(request.user.role)) {
      throw new ForbiddenException('Acesso restrito a administradores.');
    }
    return true;
  }
}
