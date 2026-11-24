import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { ConversationEntity } from './conversation.entity.js';
import { PersonEntity } from './person.entity.js';

@Entity('messages')
@Index('messages_conversation_created_idx', ['conversationId', 'createdAt', 'id'])
export class MessageEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @ForeignKey(() => ConversationEntity, { name: 'messages_conversation_fk', onDelete: 'CASCADE' })
  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ForeignKey(() => PersonEntity, { name: 'messages_author_fk', onDelete: 'CASCADE' })
  @Column({ type: 'uuid', name: 'author_id' })
  authorId: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
