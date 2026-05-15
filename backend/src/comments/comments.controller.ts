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
import { CommentsService } from './comments.service';
import { UserDocument } from '../users/user.schema';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @Get()
  findByTask(@Query('taskId') taskId: string) {
    return this.commentsService.findByTask(taskId);
  }

  @Post()
  create(
    @Body() body: { text: string; taskId: string; mentionIds?: string[] },
    @Request() req: { user: UserDocument },
  ) {
    return this.commentsService.create(body, req.user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { text: string },
    @Request() req: { user: UserDocument },
  ) {
    return this.commentsService.update(id, body.text, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.commentsService.delete(id, req.user);
  }

  @Post(':id/reactions')
  toggleReaction(
    @Param('id') id: string,
    @Body() body: { emoji: string },
    @Request() req: { user: UserDocument },
  ) {
    return this.commentsService.toggleReaction(id, body.emoji, req.user._id.toString());
  }
}
