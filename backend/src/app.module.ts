import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InvitesModule } from './invites/invites.module';
import { PermissionsModule } from './permissions/permissions.module';
import { GatewayModule } from './gateway/gateway.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { AnnouncementsModule } from './announcements/announcements.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URI');
        if (!uri) {
          throw new Error('MONGODB_URI is required');
        }

        return { uri };
      },
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    NotificationsModule,
    InvitesModule,
    PermissionsModule,
    GatewayModule,
    SchedulerModule,
    SuperAdminModule,
    AnnouncementsModule,
  ],
})
export class AppModule {}
