import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationParticipantEntity } from '../database/entities/conversation-participant.entity.js';
import { ConversationEntity } from '../database/entities/conversation.entity.js';
import { MentionEntity } from '../database/entities/mention.entity.js';
import { MessageEntity } from '../database/entities/message.entity.js';
import { PersonEntity } from '../database/entities/person.entity.js';
import { RealtimeModule } from '../realtime/realtime.module.js';
import { ConversationAccessService } from './conversation-access.service.js';
import { ConversationEvents } from './conversation-events.service.js';
import { ConversationsController } from './conversations.controller.js';
import { ConversationsService } from './conversations.service.js';
import { MembersController } from './members.controller.js';
import { MentionsService } from './mentions.service.js';
import { MessagesService } from './messages.service.js';
import { TypingService } from './typing.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConversationEntity, ConversationParticipantEntity, MessageEntity, MentionEntity, PersonEntity]),
    RealtimeModule,
  ],
  controllers: [ConversationsController, MembersController],
  providers: [ConversationAccessService, ConversationEvents, ConversationsService, MentionsService, MessagesService, TypingService],
  exports: [ConversationAccessService],
})
export class ConversationsModule {}
