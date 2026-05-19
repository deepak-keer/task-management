import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { UserDocument } from '../users/user.schema';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Get()
  findAll(@Request() req: { user: UserDocument }) {
    return this.projectsService.findAll(req.user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.projectsService.findById(id, req.user);
  }

  @Post()
  create(
    @Body() body: { name: string; description?: string },
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.create(body, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; description: string; columns: unknown[] }>,
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.update(id, body, req.user);
  }

  @Post(':id/columns')
  addColumn(
    @Param('id') id: string,
    @Body() body: { name: string; color?: string },
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.addColumn(id, body, req.user);
  }

  @Patch(':id/columns/reorder')
  reorderColumns(
    @Param('id') id: string,
    @Body() body: { columnIds: string[] },
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.reorderColumns(id, body.columnIds, req.user);
  }

  @Patch(':id/columns/:columnId')
  updateColumn(
    @Param('id') id: string,
    @Param('columnId') columnId: string,
    @Body() body: { name?: string; color?: string },
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.updateColumn(id, columnId, body, req.user);
  }

  @Patch(':id/columns/:columnId/archive')
  archiveColumn(
    @Param('id') id: string,
    @Param('columnId') columnId: string,
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.archiveColumn(id, columnId, req.user);
  }

  @Patch(':id/columns/:columnId/restore')
  restoreColumn(
    @Param('id') id: string,
    @Param('columnId') columnId: string,
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.restoreColumn(id, columnId, req.user);
  }

  @Delete(':id/columns/:columnId')
  deleteColumn(
    @Param('id') id: string,
    @Param('columnId') columnId: string,
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.deleteColumn(id, columnId, req.user);
  }

  @Patch(':id/archive')
  archive(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.projectsService.archive(id, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.projectsService.delete(id, req.user);
  }

  @Post(':id/members')
  addMember(
    @Param('id') id: string,
    @Body() body: { userId: string },
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.addMember(id, body.userId, req.user);
  }

  @Delete(':id/members/:userId')
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Request() req: { user: UserDocument },
  ) {
    return this.projectsService.removeMember(id, userId, req.user);
  }
}
