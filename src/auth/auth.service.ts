import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  AdminAccessRequestStatus,
  Therapist,
  TherapistRole,
} from '@prisma/client';

import { Env } from '../config/env.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  hashPassword,
  hashResetToken,
  generateResetToken,
  RESET_TOKEN_RETENTION_MS,
  RESET_TOKEN_TTL_MS,
  verifyPassword,
} from './auth.crypto';
import {
  AdminAccessRequestInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  VerifyResetCodeInput,
} from './schemas/auth.schemas';

type AuthUser = {
  fullName: string;
  email: string;
  role: TherapistRole;
  mustChangePassword: boolean;
  canManageAccessRequests: boolean;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

const ACCESS_REQUEST_GENERIC_MESSAGE =
  'Se os dados forem válidos, sua solicitação será analisada.';

const WEB_MANAGER_ROLES: TherapistRole[] = [
  TherapistRole.ASSISTANT,
  TherapistRole.ADMIN,
];

/** Roles com acesso ao gerenciador web (ajudante/professora); todas também usam o app. */
function isWebManagerRole(role: TherapistRole): boolean {
  return WEB_MANAGER_ROLES.includes(role);
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<Env, true>,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    await this.cleanupStalePasswordResetTokens();
  }

  async register(input: RegisterInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    // Uma conta por e-mail: ajudante/professora já usam a mesma conta no app.
    const existingTherapist = await this.prisma.therapist.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingTherapist) {
      throw new ConflictException('Este e-mail já está cadastrado.');
    }

    const passwordHash = await hashPassword(input.password);
    const therapist = await this.prisma.therapist.create({
      data: {
        email,
        fullName: input.fullName.trim(),
        passwordHash,
        role: TherapistRole.THERAPIST,
      },
    });

    return this.buildAuthResponse(therapist.id, {
      fullName: therapist.fullName,
      email: therapist.email,
      role: therapist.role,
      mustChangePassword: therapist.mustChangePassword,
    });
  }

  /**
   * Mesma conta no app e no gerenciador. O app aceita qualquer role; o gerenciador
   * (`panel: 'web'`) só ajudante/professora — com o mesmo erro genérico (anti-enumeração).
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();
    const account = await this.prisma.therapist.findUnique({
      where: { email },
    });

    const valid = account
      ? await verifyPassword(account.passwordHash, input.password)
      : false;

    if (!account || !valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    if (input.panel === 'web' && !isWebManagerRole(account.role)) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    return this.buildAuthResponse(account.id, {
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      mustChangePassword: account.mustChangePassword,
    });
  }

  /**
   * Ajudante = conta do app (THERAPIST) promovida após aprovação. A senha do app
   * prova a posse da conta; qualquer falha responde genericamente (anti-enumeração).
   */
  async requestAdminAccess(
    input: AdminAccessRequestInput,
  ): Promise<{ message: string }> {
    const email = input.email.toLowerCase();
    const fullName = input.fullName.trim();

    const appAccount = await this.prisma.therapist.findUnique({
      where: { email },
    });

    if (!appAccount || appAccount.role !== TherapistRole.THERAPIST) {
      return { message: ACCESS_REQUEST_GENERIC_MESSAGE };
    }

    const validPassword = await verifyPassword(
      appAccount.passwordHash,
      input.password,
    );
    if (!validPassword) {
      return { message: ACCESS_REQUEST_GENERIC_MESSAGE };
    }

    const pending = await this.prisma.adminAccessRequest.findFirst({
      where: {
        therapistId: appAccount.id,
        status: AdminAccessRequestStatus.PENDING,
      },
      select: { id: true },
    });

    if (pending) {
      return { message: ACCESS_REQUEST_GENERIC_MESSAGE };
    }

    await this.prisma.adminAccessRequest.create({
      data: { email, fullName, therapistId: appAccount.id },
    });

    return { message: ACCESS_REQUEST_GENERIC_MESSAGE };
  }

  async changePassword(
    therapistId: string,
    input: ChangePasswordInput,
  ): Promise<{ message: string }> {
    const therapist = await this.prisma.therapist.findUnique({
      where: { id: therapistId },
    });

    if (!therapist) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }

    // Senha temporária / troca obrigatória é só do gerenciador web (ASSISTANT/ADMIN).
    if (!isWebManagerRole(therapist.role)) {
      throw new ForbiddenException(
        'Alteração de senha autenticada é exclusiva do gerenciador web. No app mobile use a recuperação de senha.',
      );
    }

    const valid = await verifyPassword(
      therapist.passwordHash,
      input.currentPassword,
    );
    if (!valid) {
      throw new UnauthorizedException('Senha atual inválida.');
    }

    const passwordHash = await hashPassword(input.newPassword);
    await this.prisma.therapist.update({
      where: { id: therapistId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    return { message: 'Senha alterada com sucesso.' };
  }

  async forgotPassword(
    input: ForgotPasswordInput,
  ): Promise<{ message: string }> {
    await this.cleanupStalePasswordResetTokens();

    const email = input.email.toLowerCase();
    const therapist = await this.resolveAccountForPasswordReset(
      email,
      input.panel,
    );

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

  async verifyResetCode(
    input: VerifyResetCodeInput,
  ): Promise<{ message: string }> {
    await this.findValidResetToken(input.email, input.token, input.panel);
    return { message: 'Código válido.' };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const resetToken = await this.findValidResetToken(
      input.email,
      input.token,
      input.panel,
    );
    const therapist = await this.prisma.therapist.findUniqueOrThrow({
      where: { id: resetToken.therapistId },
    });

    const passwordHash = await hashPassword(input.password);

    await this.prisma.$transaction([
      this.prisma.therapist.update({
        where: { id: therapist.id },
        data: {
          passwordHash,
          mustChangePassword: false,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { consumed: true },
      }),
    ]);

    return { message: 'Senha alterada com sucesso.' };
  }

  /** Gerenciador web (`panel: 'web'`) só recupera contas de ajudante/professora. */
  private async resolveAccountForPasswordReset(
    email: string,
    panel?: 'web',
  ): Promise<Therapist | null> {
    const account = await this.prisma.therapist.findUnique({
      where: { email },
    });

    if (account && panel === 'web' && !isWebManagerRole(account.role)) {
      return null;
    }

    return account;
  }

  private async findValidResetToken(
    email: string,
    token: string,
    panel?: 'web',
  ) {
    const therapist = await this.resolveAccountForPasswordReset(
      email.toLowerCase(),
      panel,
    );

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

  /** Remove tokens expirados ou com mais de 24h (RF003 — minimização de retenção). */
  private async cleanupStalePasswordResetTokens(): Promise<void> {
    const retentionCutoff = new Date(Date.now() - RESET_TOKEN_RETENTION_MS);

    await this.prisma.passwordResetToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { createdAt: { lt: retentionCutoff } },
        ],
      },
    });
  }

  private buildAuthResponse(
    therapistId: string,
    user: Omit<AuthUser, 'canManageAccessRequests' | 'mustChangePassword'> & {
      mustChangePassword?: boolean;
    },
  ): AuthResponse {
    // mustChangePassword / senha temporária: somente contas do gerenciador web.
    const mustChangePassword = isWebManagerRole(user.role)
      ? Boolean(user.mustChangePassword)
      : false;

    const authUser: AuthUser = {
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      mustChangePassword,
      canManageAccessRequests: user.role === TherapistRole.ADMIN,
    };

    const accessToken = this.jwtService.sign(
      { sub: therapistId, email: authUser.email, role: authUser.role },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    return { accessToken, user: authUser };
  }
}
