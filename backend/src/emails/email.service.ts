import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendEmailViaNodemailer(
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<{ success: boolean; errorMessage?: string }> {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = Number(this.configService.get<string>('SMTP_PORT') || 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASSWORD');
    const from = this.configService.get<string>('EMAIL_FROM') || user;

    if (!host || !user || !pass || !from) {
      return {
        success: false,
        errorMessage: 'SMTP_HOST, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM are required',
      };
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    try {
      await transporter.sendMail({ from, to, subject, html: htmlBody });
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email send failed for ${to}: ${errorMessage}`);
      return { success: false, errorMessage };
    }
  }
}
