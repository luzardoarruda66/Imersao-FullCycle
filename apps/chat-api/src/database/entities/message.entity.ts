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

  /** Citação: outra mensagem da mesma conversa (F1-05). */
  @ForeignKey(() => MessageEntity, { name: 'messages_quoted_message_fk', onDelete: 'SET NULL' })
  @Column({ type: 'uuid', name: 'quoted_message_id', nullable: true })
  quotedMessageId: string | null;

  /** Vazio até a primeira edição. */
  @Column({ type: 'timestamptz', name: 'edited_at', nullable: true })
  editedAt: Date | null;

  /** Ao apagar, o texto é zerado e a linha fica para mostrar "Mensagem apagada" (HLD, seção 7). */
  @Column({ type: 'timestamptz', name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
