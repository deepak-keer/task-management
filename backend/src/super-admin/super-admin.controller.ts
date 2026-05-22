import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SuperAdminService } from './super-admin.service';
import { UserDocument } from '../users/user.schema';

@Controller('super-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class SuperAdminController {
  constructor(private superAdminService: SuperAdminService) {}

  @Get('users')
  getAllUsers(
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.superAdminService.getAllUsers({ search, role, status, page, limit });
  }

  @Get('pending-approvals')
  getPendingApprovals() {
    return this.superAdminService.getPendingApprovals();
  }

  @Get('stats')
  getStats() {
    return this.superAdminService.getStats();
  }

  @Get('workspaces')
  getAllProjects() {
    return this.superAdminService.getAllProjects();
  }

  @Get('user-tasks')
  getUserTaskOverview(@Query('userId') userId?: string) {
    return this.superAdminService.getUserTaskOverview(userId);
  }

  @Patch('users/:id/approve')
  approveUser(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.superAdminService.approveUser(id, req.user._id.toString());
  }

  @Patch('users/:id/reject')
  rejectUser(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.superAdminService.rejectUser(id, body.reason);
  }

  @Patch('users/:id/ban')
  banUser(@Param('id') id: string) {
    return this.superAdminService.banUser(id);
  }

  @Patch('users/:id/unban')
  unbanUser(@Param('id') id: string) {
    return this.superAdminService.unbanUser(id);
  }

  @Delete('users/:id')
  deleteUser(@Param('id') id: string) {
    return this.superAdminService.deleteUser(id);
  }

  @Patch('workspaces/:id/archive')
  archiveProject(@Param('id') id: string) {
    return this.superAdminService.archiveProject(id);
  }

  @Patch('workspaces/:id/restore')
  restoreProject(@Param('id') id: string) {
    return this.superAdminService.restoreProject(id);
  }

  @Delete('workspaces/:id')
  deleteProject(@Param('id') id: string) {
    return this.superAdminService.deleteProject(id);
  }
}
