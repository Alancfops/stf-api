import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { TherapistRole } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { Env } from '../config/env.schema';
import { PrismaService } from '../prisma/prisma.service';

type JwtPayload = {
  sub: string;
  email: string;
  role?: TherapistRole;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });

    if (!therapist) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }

    return {
      therapistId: therapist.id,
      email: therapist.email,
      role: therapist.role,
    };
  }
}
