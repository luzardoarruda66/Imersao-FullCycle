import { Check, Column, Entity, ForeignKey, PrimaryColumn } from 'typeorm';
import { ConversationEntity } from './conversation.entity.js';
import { MessageEntity } from './message.entity.js';
import { PersonEntity } from './person.entity.js';

/**
 * Estado de leitura por pessoa e conversa: a posição de leitura (a última mensagem lida) e os contadores gravados
 * de não lidas e de menções (ADR 0021; LLD, "Dados" e "Concorrência e idempotência").
 */
@Entity('conversation_read_states')
@Check('conversation_read_states_counts_check', `"unread_count" >= 0 AND "mention_count" >= 0`)
export class ConversationReadStateEntity {
  @ForeignKey(() => ConversationEntity, { name: 'conversation_read_states_conversation_fk', onDelete: 'CASCADE' })
  @PrimaryColumn({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ForeignKey(() => PersonEntity, { name: 'conversation_read_states_person_fk', onDelete: 'CASCADE' })
  @PrimaryColumn({ type: 'uuid', name: 'person_id' })
  personId: string;

  /** Vazia até a primeira leitura. */
  @ForeignKey(() => MessageEntity, { name: 'conversation_read_states_message_fk', onDelete: 'SET NULL' })
  @Column({ type: 'uuid', name: 'last_read_message_id', nullable: true })
  lastReadMessageId: string | null;

  @Column({ type: 'integer', name: 'unread_count', default: 0 })
  unreadCount: number;

  /** Só a F1-05 soma; fica zerado até lá. */
  @Column({ type: 'integer', name: 'mention_count', default: 0 })
  mentionCount: number;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
