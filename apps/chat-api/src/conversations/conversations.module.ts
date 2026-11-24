import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationParticipantEntity } from '../database/entities/conversation-participant.entity.js';
import { ConversationEntity } from '../database/entities/conversation.entity.js';
import { MessageEntity } from '../database/entities/message.entity.js';
import { ConversationAccessService } from './conversation-access.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ConversationEntity, ConversationParticipantEntity, MessageEntity])],
  providers: [ConversationAccessService],
  exports: [ConversationAccessService],
})
export class ConversationsModule {}
