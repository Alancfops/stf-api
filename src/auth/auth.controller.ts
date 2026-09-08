import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { CurrentTherapist } from '../common/decorators/current-therapist.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  adminAccessRequestSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verifyResetCodeSchema,
} from './schemas/auth.schemas';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'RF001 — Cadastro do fisioterapeuta' })
  register(@Body(new ZodValidationPipe(registerSchema)) body: z.infer<typeof registerSchema>) {
    return this.authService.register(body);
  }

  @Post('login')
  @ApiOperation({ summary: 'RF002 — Login do fisioterapeuta' })
  login(@Body(new ZodValidationPipe(loginSchema)) body: z.infer<typeof loginSchema>) {
    return this.authService.login(body);
  }

  @Post('admin-access-request')
  @ApiOperation({ summary: 'Solicitar acesso administrativo (público)' })
  requestAdminAccess(
    @Body(new ZodValidationPipe(adminAccessRequestSchema))
    body: z.infer<typeof adminAccessRequestSchema>,
  ) {
    return this.authService.requestAdminAccess(body);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Alterar senha no gerenciador (ADMIN); limpa mustChangePassword após senha temporária',
  })
  changePassword(
    @CurrentTherapist() user: { therapistId: string },
    @Body(new ZodValidationPipe(changePasswordSchema))
    body: z.infer<typeof changePasswordSchema>,
  ) {
    return this.authService.changePassword(user.therapistId, body);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'RF003 — Solicitar código de recuperação' })
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: z.infer<typeof forgotPasswordSchema>,
  ) {
    return this.authService.forgotPassword(body);
  }

  @Post('verify-reset-code')
  @ApiOperation({ summary: 'RF003 — Validar código antes de definir nova senha' })
  verifyResetCode(
    @Body(new ZodValidationPipe(verifyResetCodeSchema)) body: z.infer<typeof verifyResetCodeSchema>,
  ) {
    return this.authService.verifyResetCode(body);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'RF003 — Redefinir senha com código' })
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordSchema)) body: z.infer<typeof resetPasswordSchema>,
  ) {
    return this.authService.resetPassword(body);
  }
}
