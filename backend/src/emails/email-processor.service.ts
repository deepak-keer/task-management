import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { EmailService } from './email.service';
import { PendingEmail, PendingEmailDocument } from './pending-email.schema';

@Injectable()
export class EmailProcessorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EmailProcessorService.name);
  private processing = false;
  private lastRunAt = 0;

  constructor(
    @InjectModel(PendingEmail.name) private pendingEmailModel: Model<PendingEmailDocument>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    setTimeout(() => {
      void this.processPendingEmails(true, 'startup').catch((error) => {
        this.logger.error(`Startup email queue run failed: ${error instanceof Error ? error.message : String(error)}`);
      });
    }, 5000);
  }

  @Cron('* * * * *')
  async processPendingEmails(
    force = false,
    source = 'cron',
  ): Promise<{ checked: number; sent: number; failed: number; skipped: boolean }> {
    if (this.processing) return { checked: 0, sent: 0, failed: 0, skipped: true };
    const intervalMinutes = Number(this.configService.get<string>('CRON_EMAIL_INTERVAL') || 5);
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    if (!force && Date.now() - this.lastRunAt < intervalMs) {
      return { checked: 0, sent: 0, failed: 0, skipped: true };
    }

    this.processing = true;
    this.lastRunAt = Date.now();
    const startedAt = new Date();

    try {
      const pendingEmails = await this.pendingEmailModel
        .find({ status: 'pending' })
        .sort({ createdAt: 1 })
        .limit(50)
        .exec();

      if (pendingEmails.length === 0) {
        this.logger.log(`Email queue check completed from ${source}: no pending emails`);
        return { checked: 0, sent: 0, failed: 0, skipped: false };
      }

      let sent = 0;
      let failed = 0;

      for (const email of pendingEmails) {
        try {
          const result = await this.emailService.sendEmail(
            email.recipientEmail,
            email.subject,
            email.htmlBody,
          );
          if (!result.success) {
            throw new Error(result.errorMessage || 'Email send failed');
          }

          await this.pendingEmailModel.updateOne(
            { _id: email._id },
            { $set: { status: 'sent', sentAt: new Date(), errorMessage: '' } },
          );
          sent += 1;
        } catch (error) {
          const retries = (email.retries || 0) + 1;
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.pendingEmailModel.updateOne(
            { _id: email._id },
            {
              $set: {
                status: retries >= 3 ? 'failed' : 'pending',
                errorMessage,
              },
              $inc: { retries: 1 },
            },
          );
          failed += 1;
          this.logger.error(
            `Queued email failed user=${email.userId.toString()} type=${email.notificationType} retries=${retries}: ${errorMessage}`,
          );
        }
      }

      this.logger.log(
        `Email queue run completed from ${source} in ${Date.now() - startedAt.getTime()}ms: checked=${pendingEmails.length}, sent=${sent}, failed=${failed}`,
      );
      return { checked: pendingEmails.length, sent, failed, skipped: false };
    } finally {
      this.processing = false;
    }
  }
}
