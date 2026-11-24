import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { ConversationEntity } from './conversation.entity.js';
import { PersonEntity } from './person.entity.js';

/** Participantes de canal privado e de conversa direta; o canal público não grava participantes. */
@Entity('conversation_participants')
@Index('conversation_participants_person_idx', ['personId'])
export class ConversationParticipantEntity {
  @ForeignKey(() => ConversationEntity, { name: 'conversation_participants_conversation_fk', onDelete: 'CASCADE' })
  @PrimaryColumn({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ForeignKey(() => PersonEntity, { name: 'conversation_participants_person_fk', onDelete: 'CASCADE' })
  @PrimaryColumn({ type: 'uuid', name: 'person_id' })
  personId: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
