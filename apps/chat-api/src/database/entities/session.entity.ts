import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { MfaState } from '@nestjs/authentication';

export type Json = object | string | number | boolean | null;

/** Formato do `SessionStore` do `@nestjs/authentication`; o id é o SHA-256 do token do cookie. */
@Entity('sessions')
@Index('sessions_user_id_idx', ['userId'])
@Index('sessions_expires_at_idx', ['expiresAt'])
export class SessionEntity {
  @PrimaryColumn({ type: 'text' })
  id: string;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @Column({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'expires_at' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', name: 'last_active_at' })
  lastActiveAt: Date;

  @Column({ type: 'text', nullable: true })
  mfa: MfaState | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, Json> | null;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
