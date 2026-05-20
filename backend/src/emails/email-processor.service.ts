import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import { EmailService } from './email.service';
import { PendingEmail, PendingEmailDocument } from './pending-email.schema';

@Injectable()
export class EmailProcessorService {
  private readonly logger = new Logger(EmailProcessorService.name);
  private processing = false;
  private lastRunAt = 0;

  constructor(
    @InjectModel(PendingEmail.name) private pendingEmailModel: Model<PendingEmailDocument>,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  @Cron('* * * * *')
  async processPendingEmails(): Promise<void> {
    if (this.processing) return;
    const intervalMinutes = Number(this.configService.get<string>('CRON_EMAIL_INTERVAL') || 5);
    const intervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    if (Date.now() - this.lastRunAt < intervalMs) return;

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
        this.logger.log('Email queue check completed: no pending emails');
        return;
      }

      let sent = 0;
      let failed = 0;

      for (const email of pendingEmails) {
        try {
          const result = await this.emailService.sendEmailViaNodemailer(
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
        `Email queue run completed in ${Date.now() - startedAt.getTime()}ms: sent=${sent}, failed=${failed}`,
      );
    } finally {
      this.processing = false;
    }
  }
}
