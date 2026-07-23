import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import {
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
