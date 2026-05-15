import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvitesController } from './invites.controller';
import { InvitesService } from './invites.service';
import { InviteLink, InviteLinkSchema } from './invite-link.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: InviteLink.name, schema: InviteLinkSchema }])],
  controllers: [InvitesController],
  providers: [InvitesService],
  exports: [InvitesService, MongooseModule],
})
export class InvitesModule {}
