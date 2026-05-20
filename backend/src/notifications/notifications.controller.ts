import {
  Controller,
  Get,
  Patch,
  Delete,
  ForbiddenException,
  Param,
  Post,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { UserDocument } from '../users/user.schema';
import { EmailProcessorService } from '../emails/email-processor.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private emailProcessorService: EmailProcessorService,
  ) {}

  @Get()
  getAll(
    @Request() req: { user: UserDocument },
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.notificationsService.getUserNotifications(
      req.user._id.toString(),
      Number(page),
      Number(limit),
    );
  }

  @Get('unread-count')
  getUnreadCount(@Request() req: { user: UserDocument }) {
    return this.notificationsService.getUnreadCount(req.user._id.toString());
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.notificationsService.markAsRead(id, req.user._id.toString());
  }

  @Patch('read-all')
  markAllAsRead(@Request() req: { user: UserDocument }) {
    return this.notificationsService.markAllAsRead(req.user._id.toString());
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.notificationsService.delete(id, req.user._id.toString());
  }

  @Post('process-email-queue')
  processEmailQueue(@Request() req: { user: UserDocument }) {
    if (req.user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can process the email queue');
    }

    return this.emailProcessorService.processPendingEmails(true, 'manual');
  }
}
