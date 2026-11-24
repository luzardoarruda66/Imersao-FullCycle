import { Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { MessageEntity } from './message.entity.js';
import { PersonEntity } from './person.entity.js';

/**
 * Uma pessoa mencionada numa mensagem: única na dupla, removida com a mensagem ou a pessoa. É a fonte do contador
 * de menções e da notificação da F1-06 (LLD, "Dados").
 */
@Entity('mentions')
@Index('mentions_person_idx', ['personId', 'messageId'])
export class MentionEntity {
  @ForeignKey(() => MessageEntity, { name: 'mentions_message_fk', onDelete: 'CASCADE' })
  @PrimaryColumn({ type: 'uuid', name: 'message_id' })
  messageId: string;

  @ForeignKey(() => PersonEntity, { name: 'mentions_person_fk', onDelete: 'CASCADE' })
  @PrimaryColumn({ type: 'uuid', name: 'person_id' })
  personId: string;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;
}
