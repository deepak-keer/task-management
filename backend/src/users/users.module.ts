import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './user.schema';
import { GatewayModule } from '../gateway/gateway.module';
import { NotificationPreference, NotificationPreferenceSchema } from '../emails/notification-preference.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: NotificationPreference.name, schema: NotificationPreferenceSchema },
    ]),
    GatewayModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
