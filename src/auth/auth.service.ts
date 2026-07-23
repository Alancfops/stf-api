import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { Env } from '../config/env.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  RESET_TOKEN_TTL_MS,
  verifyPassword,
} from './auth.crypto';
import {
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyResetCodeInput,
} from './schemas/auth.schemas';

type AuthUser = {
  fullName: string;
  email: string;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly notifications: NotificationsService,
  ) {}

  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    const existing = await this.prisma.therapist.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const passwordHash = await hashPassword(input.password);
    const therapist = await this.prisma.therapist.create({
      data: {
        email,
        fullName: input.fullName.trim(),
        passwordHash,
      },
    });

    return this.buildAuthResponse(therapist.id, {
      fullName: therapist.fullName,
      email: therapist.email,
    });
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    const therapist = await this.prisma.therapist.findUnique({
      where: { email },
    });

    if (!therapist) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const valid = await verifyPassword(therapist.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.buildAuthResponse(therapist.id, {
      fullName: therapist.fullName,
      email: therapist.email,
    });
  }

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    const email = input.email.toLowerCase();
    const therapist = await this.prisma.therapist.findUnique({
      where: { email },
    });

    if (therapist) {
      const token = generateResetToken();
      const tokenHash = hashResetToken(token);
      const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: {
            therapistId: therapist.id,
            consumed: false,
          },
          data: { consumed: true },
        }),
        this.prisma.passwordResetToken.create({
          data: {
            therapistId: therapist.id,
            tokenHash,
            expiresAt,
          },
        }),
      ]);

      try {
        await this.notifications.sendPasswordResetCode(email, token);
      } catch (error) {
        await this.prisma.passwordResetToken.updateMany({
          where: {
            therapistId: therapist.id,
            tokenHash,
            consumed: false,
          },
          data: { consumed: true },
        });

        if (error instanceof InternalServerErrorException) {
          throw error;
        }

        throw new InternalServerErrorException(
          'Não foi possível enviar o e-mail de recuperação.',
        );
      }
    }

    return {
      message:
        'Se o e-mail estiver cadastrado, enviaremos um código de recuperação.',
    };
  }

  async verifyResetCode(input: VerifyResetCodeInput): Promise<{ message: string }> {
    await this.findValidResetToken(input.email, input.token);
    return { message: 'Código válido.' };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const resetToken = await this.findValidResetToken(input.email, input.token);
    const therapist = await this.prisma.therapist.findUniqueOrThrow({
      where: { id: resetToken.therapistId },
    });

    const passwordHash = await hashPassword(input.password);

    await this.prisma.$transaction([
      this.prisma.therapist.update({
        where: { id: therapist.id },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumed: true },
      }),
    ]);

    return { message: 'Senha alterada com sucesso.' };
  }

  private async findValidResetToken(email: string, token: string) {
    const therapist = await this.prisma.therapist.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!therapist) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        therapistId: therapist.id,
        tokenHash: hashResetToken(token),
        consumed: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Código inválido ou expirado.');
    }

    return resetToken;
  }

  private buildAuthResponse(
    therapistId: string,
    user: AuthUser,
  ): AuthResponse {
    const accessToken = this.jwtService.sign(
      { sub: therapistId, email: user.email },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    return { accessToken, user };
  }
}
