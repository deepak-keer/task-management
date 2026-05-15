import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { UserDocument } from '../users/user.schema';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: string,
    @Query('assignee') assignee?: string,
    @Query('priority') priority?: string,
    @Query('search') search?: string,
    @Request() req?: { user: UserDocument },
  ) {
    return this.tasksService.findAll({ projectId, status, assignee, priority, search }, req?.user);
  }

  @Get('my')
  findMyTasks(@Request() req: { user: UserDocument }) {
    return this.tasksService.findMyTasks(req.user._id.toString());
  }

  @Get('overdue')
  findOverdue(@Request() req: { user: UserDocument }) {
    return this.tasksService.findOverdue(req.user._id.toString());
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.tasksService.findById(id, req.user);
  }

  @Post()
  create(
    @Body()
    body: {
      title: string;
      description?: string;
      status: string;
      column: string;
      priority?: string;
      projectId: string;
      assigneeId?: string;
      dueDate?: Date;
      labels?: string[];
    },
    @Request() req: { user: UserDocument },
  ) {
    return this.tasksService.create(body, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: Partial<{
      title: string;
      description: string;
      status: string;
      column: string;
      priority: string;
      assigneeId: string | null;
      dueDate: Date | null;
      labels: string[];
      subtasks: unknown[];
    }>,
    @Request() req: { user: UserDocument },
  ) {
    return this.tasksService.update(id, body, req.user);
  }

  @Patch(':id/move')
  move(
    @Param('id') id: string,
    @Body() body: { column: string; status: string; order: number },
    @Request() req: { user: UserDocument },
  ) {
    return this.tasksService.move(id, body, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.tasksService.delete(id, req.user);
  }

  @Post(':id/subtasks')
  addSubtask(
    @Param('id') id: string,
    @Body() body: { title: string },
    @Request() req: { user: UserDocument },
  ) {
    return this.tasksService.addSubtask(id, body.title, req.user);
  }

  @Patch(':id/subtasks/:subtaskId')
  toggleSubtask(
    @Param('id') id: string,
    @Param('subtaskId') subtaskId: string,
    @Request() req: { user: UserDocument },
  ) {
    return this.tasksService.toggleSubtask(id, subtaskId, req.user);
  }

  @Post(':id/watch')
  watch(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.tasksService.watch(id, req.user._id.toString());
  }

  @Delete(':id/watch')
  unwatch(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.tasksService.unwatch(id, req.user._id.toString());
  }

  @Post(':id/attachments')
  addAttachment(
    @Param('id') id: string,
    @Body() body: { url: string; name: string; size: number },
    @Request() req: { user: UserDocument },
  ) {
    return this.tasksService.addAttachment(id, body, req.user);
  }
}
