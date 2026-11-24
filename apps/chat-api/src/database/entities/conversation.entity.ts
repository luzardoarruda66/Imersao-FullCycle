import { Check, Column, Entity, ForeignKey, Index, PrimaryColumn } from 'typeorm';
import { PersonEntity } from './person.entity.js';

export const CONVERSATION_TYPES = ['canal_publico', 'canal_privado', 'direta'] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

@Entity('conversations')
@Check('conversations_type_check', `"type" IN ('canal_publico', 'canal_privado', 'direta')`)
@Check(
  'conversations_shape_check',
  `("type" = 'direta' AND "name" IS NULL AND "direct_key" IS NOT NULL) OR ("type" <> 'direta' AND "name" IS NOT NULL AND "direct_key" IS NULL)`,
)
// A unicidade do nome ignora maiúsculas (`lower(name)`), que o decorador não expressa: o índice vive na migração.
@Index('conversations_channel_name_key', { synchronize: false })
@Index('conversations_direct_key_key', ['directKey'], { unique: true, where: `"type" = 'direta'` })
export class ConversationEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text' })
  type: ConversationType;

  /** Só canais têm nome; a conversa direta não. */
  @Column({ type: 'text', nullable: true })
  name: string | null;

  /** Só a conversa direta: `menorId:maiorId` do par, para o índice único não depender da ordem. */
  @Column({ type: 'text', name: 'direct_key', nullable: true })
  directKey: string | null;

  @ForeignKey(() => PersonEntity, { name: 'conversations_created_by_fk', onDelete: 'SET NULL' })
  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy: string | null;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
