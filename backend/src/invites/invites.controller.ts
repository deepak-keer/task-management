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
import { InvitesService, CreateInviteDto } from './invites.service';
import { UserDocument } from '../users/user.schema';

@Controller('invites')
export class InvitesController {
  constructor(private invitesService: InvitesService) {}

  @Get('validate/:token')
  validate(@Param('token') token: string) {
    return this.invitesService.validate(token);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateInviteDto, @Request() req: { user: UserDocument }) {
    return this.invitesService.create(dto, req.user);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Request() req: { user: UserDocument }) {
    return this.invitesService.findAll(req.user);
  }

  @Patch(':id/revoke')
  @UseGuards(JwtAuthGuard)
  revoke(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.invitesService.revoke(id, req.user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  delete(@Param('id') id: string, @Request() req: { user: UserDocument }) {
    return this.invitesService.delete(id, req.user);
  }
}
