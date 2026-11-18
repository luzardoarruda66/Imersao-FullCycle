import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';

/** Erros seguidos de entrar, por e-mail normalizado e IP (LLD, "Segurança"). */
@Entity('login_attempts')
@Unique('login_attempts_email_ip_key', ['email', 'ip'])
export class LoginAttemptEntity {
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @Column({ type: 'text', name: 'email' })
  email: string;

  @Column({ type: 'text' })
  ip: string;

  @Column({ type: 'integer', default: 0 })
  failures: number;

  /** Fim da espera; nulo enquanto não houve o limite de erros. */
  @Column({ type: 'timestamptz', name: 'blocked_until', nullable: true })
  blockedUntil: Date | null;

  @Column({ type: 'timestamptz', name: 'last_failure_at' })
  lastFailureAt: Date;

  @Column({ type: 'timestamptz', name: 'created_at', default: () => 'now()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', name: 'updated_at', default: () => 'now()' })
  updatedAt: Date;
}
