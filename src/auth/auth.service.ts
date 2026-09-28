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

const WEB_MANAGER_ROLES: TherapistRole[] = [TherapistRole.ASSISTANT, TherapistRole.ADMIN];

/** Contas do gerenciador web (ajudante/professora) — nunca THERAPIST (mobile). */
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
    const existingTherapist = await this.prisma.therapist.findUnique({
      where: {
        email_role: { email, role: TherapistRole.THERAPIST },
      },
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

  async login(input: LoginInput): Promise<AuthResponse> {
    const email = input.email.toLowerCase();

    // Gerenciador web: autentica só a conta ADMIN (mesmo e-mail pode existir no mobile).
    if (input.role) {
      const account = await this.prisma.therapist.findUnique({
        where: { email_role: { email, role: input.role } },
      });

      if (!account) {
        throw new UnauthorizedException('E-mail ou senha inválidos.');
      }

      const valid = await verifyPassword(account.passwordHash, input.password);
      if (!valid) {
        throw new UnauthorizedException('E-mail ou senha inválidos.');
      }

      return this.buildAuthResponse(account.id, {
        fullName: account.fullName,
        email: account.email,
        role: account.role,
        mustChangePassword: account.mustChangePassword,
      });
    }

    // Gerenciador web sem role definida (ex.: login genérico): restringe a
    // ASSISTANT/ADMIN, nunca autentica a conta THERAPIST (mobile).
    if (input.panel === 'web') {
      const webAccounts = await this.prisma.therapist.findMany({
        where: { email, role: { in: WEB_MANAGER_ROLES } },
      });

      const webMatches: Therapist[] = [];
      for (const account of webAccounts) {
        const valid = await verifyPassword(account.passwordHash, input.password);
        if (valid) {
          webMatches.push(account);
        }
      }

      if (webMatches.length === 0) {
        throw new UnauthorizedException('E-mail ou senha inválidos.');
      }

      const webAccount = webMatches[0];

      return this.buildAuthResponse(webAccount.id, {
        fullName: webAccount.fullName,
        email: webAccount.email,
        role: webAccount.role,
        mustChangePassword: webAccount.mustChangePassword,
      });
    }

    const accounts = await this.prisma.therapist.findMany({
      where: { email },
    });

    if (accounts.length === 0) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    const matches: Therapist[] = [];
    for (const account of accounts) {
      const valid = await verifyPassword(account.passwordHash, input.password);
      if (valid) {
        matches.push(account);
      }
    }

    if (matches.length === 0) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    // Mobile / legado sem role: se as duas contas tiverem a mesma senha, prioriza THERAPIST.
    const therapist =
      matches.length === 1
        ? matches[0]
        : (matches.find((account) => account.role === TherapistRole.THERAPIST) ??
          matches[0]);

    return this.buildAuthResponse(therapist.id, {
      fullName: therapist.fullName,
      email: therapist.email,
      role: therapist.role,
      mustChangePassword: therapist.mustChangePassword,
    });
  }

  async requestAdminAccess(
    input: AdminAccessRequestInput,
  ): Promise<{ message: string }> {
    const email = input.email.toLowerCase();
    const fullName = input.fullName.trim();

    const existingAssistant = await this.prisma.therapist.findUnique({
      where: {
        email_role: { email, role: TherapistRole.ASSISTANT },
      },
      select: { id: true },
    });

    // Já é ASSISTANT: não cria solicitação (resposta genérica).
    if (existingAssistant) {
      return { message: ACCESS_REQUEST_GENERIC_MESSAGE };
    }

    const pending = await this.prisma.adminAccessRequest.findFirst({
      where: { email, status: AdminAccessRequestStatus.PENDING },
      select: { id: true },
    });

    if (pending) {
      return { message: ACCESS_REQUEST_GENERIC_MESSAGE };
    }

    // THERAPIST (mobile) com o mesmo e-mail: permitido — approve cria ASSISTANT separado.
    await this.prisma.adminAccessRequest.create({
      data: { email, fullName },
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

  async forgotPassword(input: ForgotPasswordInput): Promise<{ message: string }> {
    await this.cleanupStalePasswordResetTokens();

    const email = input.email.toLowerCase();
    const therapist = await this.resolveAccountForPasswordReset(
      email,
      input.role,
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

  async verifyResetCode(input: VerifyResetCodeInput): Promise<{ message: string }> {
    await this.findValidResetToken(input.email, input.token, input.role, input.panel);
    return { message: 'Código válido.' };
  }

  async resetPassword(input: ResetPasswordInput): Promise<{ message: string }> {
    const resetToken = await this.findValidResetToken(
      input.email,
      input.token,
      input.role,
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

  /**
   * Contas com o mesmo e-mail: mobile = THERAPIST; gerenciador web =
   * ASSISTANT/ADMIN. Sem `role`:
   * - `panel === 'web'`: restringe às roles do gerenciador.
   * - caso contrário, com duas contas, prioriza THERAPIST (compatível com o app).
   */
  private async resolveAccountForPasswordReset(
    email: string,
    role?: TherapistRole,
    panel?: 'web',
  ): Promise<Therapist | null> {
    if (role) {
      return this.prisma.therapist.findUnique({
        where: { email_role: { email, role } },
      });
    }

    if (panel === 'web') {
      const webAccounts = await this.prisma.therapist.findMany({
        where: { email, role: { in: WEB_MANAGER_ROLES } },
      });
      return webAccounts[0] ?? null;
    }

    const accounts = await this.prisma.therapist.findMany({
      where: { email },
    });

    if (accounts.length === 0) {
      return null;
    }

    if (accounts.length === 1) {
      return accounts[0];
    }

    return (
      accounts.find((account) => account.role === TherapistRole.THERAPIST) ??
      accounts[0]
    );
  }

  private async findValidResetToken(
    email: string,
    token: string,
    role?: TherapistRole,
    panel?: 'web',
  ) {
    const therapist = await this.resolveAccountForPasswordReset(
      email.toLowerCase(),
      role,
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
        OR: [{ expiresAt: { lt: new Date() } }, { createdAt: { lt: retentionCutoff } }],
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
