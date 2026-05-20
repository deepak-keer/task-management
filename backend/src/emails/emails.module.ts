import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/user.schema';
import { EmailRateLimit, EmailRateLimitSchema } from './email-rate-limit.schema';
import { EmailProcessorService } from './email-processor.service';
import { EmailQueueService } from './email-queue.service';
import { EmailService } from './email.service';
import { EmailTemplateService } from './email-template.service';
import { NotificationPreference, NotificationPreferenceSchema } from './notification-preference.schema';
import { PendingEmail, PendingEmailSchema } from './pending-email.schema';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: PendingEmail.name, schema: PendingEmailSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
      { name: EmailRateLimit.name, schema: EmailRateLimitSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  providers: [EmailService, EmailTemplateService, EmailQueueService, EmailProcessorService],
  exports: [EmailQueueService, EmailProcessorService, MongooseModule],
})
export class EmailsModule {}
