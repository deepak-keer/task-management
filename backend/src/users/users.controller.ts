import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UserDocument } from './user.schema';
import { EmailNotificationType } from '../emails/email-types';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get('me/recently-viewed')
  getRecentlyViewed(@Request() req: { user: UserDocument }) {
    return this.usersService.getRecentlyViewed(req.user._id.toString());
  }

  @Get('me/stats')
  getMyStats(@Request() req: { user: UserDocument }) {
    return this.usersService.getMyStats(req.user._id.toString());
  }

  @Get('me/notification-preferences')
  getNotificationPreferences(@Request() req: { user: UserDocument }) {
    return this.usersService.getNotificationPreferences(req.user._id.toString());
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: UserDocument },
    @Body() body: Partial<UserDocument>,
  ) {
    return this.usersService.update(id, req.user._id.toString(), body);
  }

  @Patch(':id/password')
  changePassword(
    @Param('id') id: string,
    @Request() req: { user: UserDocument },
    @Body() body: { oldPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(
      id,
      req.user._id.toString(),
      body.oldPassword,
      body.newPassword,
    );
  }

  @Patch(':id/notification-preferences')
  updateNotificationPreference(
    @Param('id') id: string,
    @Request() req: { user: UserDocument },
    @Body()
    body: {
      notificationType: EmailNotificationType;
      emailEnabled?: boolean;
      inAppEnabled?: boolean;
    },
  ) {
    return this.usersService.updateNotificationPreference(id, req.user._id.toString(), body);
  }
}
