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
import { buildAdminTempPasswordEmail } from './templates/admin-temp-password.email';
import { buildPasswordResetEmail } from './templates/password-reset.email';

type OutboundEmail = {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Rótulo curto para logs (sem dados sensíveis). */
  logLabel: string;
  /** Em MAIL_PROVIDER=console, se true anexa o texto completo (ex.: senha temp em dev). */
  consoleIncludeBody?: boolean;
  failureMessage?: string;
};

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
      'MAIL_PROVIDER=console — e-mails serão exibidos no terminal (sem envio real)',
    );
  }

  async sendPasswordResetCode(email: string, code: string): Promise<void> {
    const { subject, text, html } = buildPasswordResetEmail(code);
    await this.dispatch({
      to: email,
      subject,
      text,
      html,
      logLabel: 'password-reset',
      consoleIncludeBody: true,
      failureMessage: 'Não foi possível enviar o e-mail de recuperação.',
    });
  }

  async sendAdminTempPasswordEmail(
    to: string,
    payload: { fullName: string; tempPassword: string },
  ): Promise<void> {
    const { subject, text, html } = buildAdminTempPasswordEmail(payload);
    await this.dispatch({
      to,
      subject,
      text,
      html,
      logLabel: 'admin-temp-password',
      // Console: útil em dev; provedores reais nunca logam a senha.
      consoleIncludeBody: true,
    });
  }

  private async dispatch(email: OutboundEmail): Promise<void> {
    const provider = this.config.get('MAIL_PROVIDER');
    const failureMessage =
      email.failureMessage ?? 'Não foi possível enviar o e-mail.';

    if (provider === 'console') {
      if (email.consoleIncludeBody) {
        this.logger.log(
          `[${email.logLabel}] (console) → ${email.to}\n${email.text}`,
        );
      } else {
        this.logger.log(`[${email.logLabel}] (console) → ${email.to}`);
      }
      return;
    }

    const from = this.config.get('MAIL_FROM');

    if (provider === 'gmail') {
      try {
        const info = await this.gmailTransporter!.sendMail({
          from,
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
        });
        this.logger.log(
          `E-mail ${email.logLabel} enviado para ${email.to} via Gmail (id: ${info.messageId ?? 'n/a'})`,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Falha ao enviar e-mail ${email.logLabel} para ${email.to}: ${message}`,
        );
        throw new InternalServerErrorException(failureMessage);
      }
      return;
    }

    const result = await this.resend!.emails.send({
      from,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });

    if (result.error) {
      this.logger.error(
        `Falha ao enviar e-mail ${email.logLabel} para ${email.to}: ${result.error.message}`,
      );
      throw new InternalServerErrorException(failureMessage);
    }

    this.logger.log(
      `E-mail ${email.logLabel} enviado para ${email.to} (id: ${result.data?.id ?? 'n/a'})`,
    );
  }
}
