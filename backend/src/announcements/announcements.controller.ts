import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UserDocument } from '../users/user.schema';
import { AnnouncementsService } from './announcements.service';

@Controller('announcements')
@UseGuards(JwtAuthGuard)
export class AnnouncementsController {
  constructor(private announcementsService: AnnouncementsService) {}

  @Get()
  getAll(
    @Request() req: { user: UserDocument },
    @Query('limit') limit = 8,
    @Query('managed') managed?: string,
  ) {
    return this.announcementsService.findAll(req.user, Number(limit), managed === 'true');
  }

  @Post()
  create(
    @Request() req: { user: UserDocument },
    @Body() body: {
      title: string;
      body: string;
      tone?: string;
      pinned?: boolean;
      targetType?: 'all' | 'role' | 'users';
      targetRole?: 'super_admin' | 'admin' | 'member' | null;
      recipients?: string[];
    },
  ) {
    return this.announcementsService.create(req.user, body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Request() req: { user: UserDocument },
    @Body() body: Partial<{
      title: string;
      body: string;
      tone: string;
      pinned: boolean;
      targetType: 'all' | 'role' | 'users';
      targetRole: 'super_admin' | 'admin' | 'member' | null;
      recipients: string[];
    }>,
  ) {
    return this.announcementsService.update(id, req.user, body);
  }

  @Delete(':id')
  delete(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.announcementsService.delete(id, req.user);
  }
}
