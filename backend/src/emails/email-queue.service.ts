import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Project, ProjectDocument } from '../projects/project.schema';
import { EmailRateLimit, EmailRateLimitDocument } from './email-rate-limit.schema';
import { EmailNotificationType, EMAIL_NOTIFICATION_LABELS, normalizeEmailNotificationType } from './email-types';
import { EmailTemplateService } from './email-template.service';
import { NotificationPreference, NotificationPreferenceDocument } from './notification-preference.schema';
import { PendingEmail, PendingEmailDocument } from './pending-email.schema';
import { EmailProcessorService } from './email-processor.service';

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
    @InjectModel(Project.name) private projectModel: Model<ProjectDocument>,
    private templates: EmailTemplateService,
    private configService: ConfigService,
    private emailProcessorService: EmailProcessorService,
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

    const appUrl = this.getAppUrl();
    const actionUrl = this.absoluteUrl(appUrl, data.link || '/notifications');
    const projectName = await this.getProjectName(data.meta);
    const subject = `TaskFlow: ${EMAIL_NOTIFICATION_LABELS[notificationType]}`;
    const htmlBody = this.templates.render(notificationType, {
      userName: user.name || 'there',
      message: data.message,
      taskTitle: this.getMetaString(data.meta, 'taskTitle') || 'Task',
      projectName,
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

    setTimeout(() => {
      void this.emailProcessorService.processPendingEmails(true, 'queue').catch((error) => {
        this.logger.error(
          `Queued email processor failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }, 1000);

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

  private async getProjectName(meta: Record<string, unknown> | undefined): Promise<string> {
    const projectName = this.getMetaString(meta, 'projectName');
    if (projectName) return projectName;

    const projectId = this.getMetaObjectId(meta, 'projectId');
    if (!projectId) return 'Board';

    const project = await this.projectModel.findById(projectId).select('name').lean().exec();
    return project?.name || 'Board';
  }

  private getMetaObjectId(meta: Record<string, unknown> | undefined, key: string): string {
    const value = meta?.[key];
    if (!value) return '';
    if (value instanceof Types.ObjectId) return value.toString();
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && '_id' in value) {
      const id = (value as { _id?: unknown })._id;
      if (id instanceof Types.ObjectId) return id.toString();
      if (typeof id === 'string') return id;
    }
    return '';
  }

  private getAppUrl(): string {
    const appUrl = this.configService.get<string>('APP_URL')?.trim();
    const frontendUrl = this.configService.get<string>('FRONTEND_URL')?.split(',')[0]?.trim();
    const urls = [appUrl, frontendUrl].filter((url): url is string => !!url);

    if (process.env.NODE_ENV === 'production') {
      const productionUrl = urls.find((url) => !this.isLocalhostUrl(url));
      if (!productionUrl && urls.length > 0) {
        this.logger.warn('APP_URL/FRONTEND_URL points to localhost in production; email links will be relative');
      }
      return productionUrl || '';
    }

    return urls[0] || '';
  }

  private isLocalhostUrl(url: string): boolean {
    return /^https?:\/\/(localhost|127\.0\.0\.1)(?::\d+)?/i.test(url);
  }

  private absoluteUrl(baseUrl: string, path: string): string {
    if (!baseUrl) return path;
    if (/^https?:\/\//i.test(path)) return path;
    return `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  }
}
