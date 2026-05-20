import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { EmailRateLimit, EmailRateLimitDocument } from './email-rate-limit.schema';
import { EmailNotificationType, EMAIL_NOTIFICATION_LABELS, normalizeEmailNotificationType } from './email-types';
import { EmailTemplateService } from './email-template.service';
import { NotificationPreference, NotificationPreferenceDocument } from './notification-preference.schema';
import { PendingEmail, PendingEmailDocument } from './pending-email.schema';

type QueueNotificationInput = {
  recipient: string;
  type: string;
  message: string;
  link?: string;
  meta?: Record<string, unknown>;
};

@Injectable()
export class EmailQueueService {
  private readonly logger = new Logger(EmailQueueService.name);

  constructor(
    @InjectModel(PendingEmail.name) private pendingEmailModel: Model<PendingEmailDocument>,
    @InjectModel(NotificationPreference.name) private preferenceModel: Model<NotificationPreferenceDocument>,
    @InjectModel(EmailRateLimit.name) private rateLimitModel: Model<EmailRateLimitDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private templates: EmailTemplateService,
    private configService: ConfigService,
  ) {}

  async queueEmailForNotification(data: QueueNotificationInput): Promise<void> {
    const notificationType = normalizeEmailNotificationType(data.type, data.meta || {});
    if (!notificationType) {
      this.logger.log(`Skipped email queue for notification type=${data.type}: unsupported email type`);
      return;
    }

    const user = await this.userModel.findById(data.recipient).select('name email').lean().exec();
    if (!user?.email) {
      this.logger.warn(`Skipped ${notificationType} email for ${data.recipient}: recipient email missing`);
      return;
    }

    const emailEnabled = await this.isEmailEnabled(data.recipient, notificationType);
    if (!emailEnabled) {
      this.logger.log(`Skipped ${notificationType} email for ${data.recipient}: preference disabled`);
      return;
    }

    if (await this.isRateLimited(data.recipient, notificationType)) {
      this.logger.log(`Skipped ${notificationType} email for ${data.recipient}: duplicate pending email already exists`);
      return;
    }

    const appUrl = this.configService.get<string>('APP_URL') || this.configService.get<string>('FRONTEND_URL') || '';
    const actionUrl = this.absoluteUrl(appUrl, data.link || '/notifications');
    const subject = `TaskFlow: ${EMAIL_NOTIFICATION_LABELS[notificationType]}`;
    const htmlBody = this.templates.render(notificationType, {
      userName: user.name || 'there',
      message: data.message,
      taskTitle: this.getMetaString(data.meta, 'taskTitle') || 'Task',
      projectName: this.getMetaString(data.meta, 'projectName') || 'TaskFlow',
      actorName: this.getMetaString(data.meta, 'actorName') || 'TaskFlow',
      actionUrl,
      timestamp: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
      preferencesUrl: this.absoluteUrl(appUrl, '/profile'),
    });

    await this.pendingEmailModel.create({
      userId: new Types.ObjectId(data.recipient),
      recipientEmail: user.email,
      subject,
      htmlBody,
      notificationType,
      status: 'pending',
      retries: 0,
    });
    this.logger.log(`Queued ${notificationType} email for ${user.email}`);

    await this.rateLimitModel.findOneAndUpdate(
      { userId: new Types.ObjectId(data.recipient), notificationType },
      { $set: { lastEmailTime: new Date() } },
      { upsert: true, new: true },
    );
  }

  private async isEmailEnabled(userId: string, notificationType: EmailNotificationType): Promise<boolean> {
    const preference = await this.preferenceModel
      .findOne({ userId: new Types.ObjectId(userId), notificationType })
      .lean()
      .exec();

    return preference?.emailEnabled ?? true;
  }

  private async isRateLimited(userId: string, notificationType: EmailNotificationType): Promise<boolean> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const pendingEmail = await this.pendingEmailModel.exists({
      userId: new Types.ObjectId(userId),
      notificationType,
      status: 'pending',
      createdAt: { $gte: since },
    });

    return !!pendingEmail;
  }

  private getMetaString(meta: Record<string, unknown> | undefined, key: string): string {
    const value = meta?.[key];
    return typeof value === 'string' ? value : '';
  }

  private absoluteUrl(baseUrl: string, path: string): string {
    if (!baseUrl) return path;
    if (/^https?:\/\//i.test(path)) return path;
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}
