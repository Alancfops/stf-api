import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthenticatedTherapist = {
  therapistId: string;
  email: string;
};

export const CurrentTherapist = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedTherapist => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthenticatedTherapist }>();
    return request.user;
  },
);
