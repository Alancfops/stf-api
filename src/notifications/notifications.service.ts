import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';

import { Env } from '../config/env.schema';
import { buildPasswordResetEmail } from './templates/password-reset.email';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private resend?: Resend;
  private gmailTransporter?: Transporter;

  constructor(private readonly config: ConfigService<Env, true>) {}

  onModuleInit() {
    const provider = this.config.get('MAIL_PROVIDER');

    if (provider === 'resend') {
      this.resend = new Resend(this.config.get('RESEND_API_KEY'));
      this.logger.log(
        `E-mail transacional via Resend (${this.config.get('MAIL_FROM')})`,
      );
      return;
    }

    if (provider === 'gmail') {
      this.gmailTransporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: this.config.get('GMAIL_USER'),
          pass: this.config.get('GMAIL_APP_PASSWORD'),
        },
      });
      this.logger.log(
        `E-mail transacional via Gmail SMTP (${this.config.get('MAIL_FROM')})`,
      );
      return;
    }

    this.logger.warn(
      'MAIL_PROVIDER=console — códigos RF003 serão exibidos no terminal (sem e-mail real)',
    );
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const { subject, text, html } = buildPasswordResetEmail(code);
    const provider = this.config.get('MAIL_PROVIDER');

    if (provider === 'console') {
      this.logger.log(
        `[RF003] password-reset enviado (console) → ${email} | código: ${code}`,
      );
      return;
    }

    const from = this.config.get('MAIL_FROM');

    if (provider === 'gmail') {
      try {
        const info = await this.gmailTransporter!.sendMail({
          from,
          to: email,
          subject,
          text,
          html,
        });
        this.logger.log(
          `E-mail RF003 enviado para ${email} via Gmail (id: ${info.messageId ?? 'n/a'})`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Falha ao enviar e-mail RF003 para ${email}: ${message}`);
        throw new InternalServerErrorException(
          'Não foi possível enviar o e-mail de recuperação.',
        );
      }
      return;
    }

    const result = await this.resend!.emails.send({
      from,
      to: email,
      subject,
      text,
      html,
    });

    if (result.error) {
      this.logger.error(
        `Falha ao enviar e-mail RF003 para ${email}: ${result.error.message}`,
      );
      throw new InternalServerErrorException(
        'Não foi possível enviar o e-mail de recuperação.',
      );
    }

    this.logger.log(
      `E-mail RF003 enviado para ${email} (id: ${result.data?.id ?? 'n/a'})`,
    );
  }
}
