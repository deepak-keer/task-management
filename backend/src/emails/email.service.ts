import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type ResendErrorResponse = {
  message?: string;
  name?: string;
  statusCode?: number;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {}

  async sendEmail(
    to: string,
    subject: string,
    htmlBody: string,
  ): Promise<{ success: boolean; errorMessage?: string }> {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    const from = this.configService.get<string>('EMAIL_FROM');

    if (!apiKey || !from) {
      return {
        success: false,
        errorMessage: 'RESEND_API_KEY and EMAIL_FROM are required',
      };
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject,
          html: htmlBody,
        }),
      });

      if (!response.ok) {
        const error = await this.parseResendError(response);
        throw new Error(error);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Email send failed for ${to}: ${errorMessage}`);
      return { success: false, errorMessage };
    }
  }

  private async parseResendError(response: Response): Promise<string> {
    const fallback = `Resend API failed with status ${response.status}`;

    try {
      const body = (await response.json()) as ResendErrorResponse;
      return body.message || body.name || fallback;
    } catch {
      return fallback;
    }
  }
}
