import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Clock } from '../clock.js';
import { LOGIN_MAX_FAILURES, LOGIN_WAIT_MS } from '../config/values.js';
import { LoginAttemptEntity } from '../database/entities/login-attempt.entity.js';

/** Limite de erros seguidos de entrar por e-mail normalizado e IP (LLD, "Segurança" e 6.2). */
@Injectable()
export class LoginAttemptsService {
  constructor(
    @InjectRepository(LoginAttemptEntity) private readonly attempts: Repository<LoginAttemptEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly clock: Clock,
  ) {}

  /** Segundos que faltam para a espera acabar, ou 0 quando a entrada está liberada. */
  async remainingSeconds(email: string, ip: string): Promise<number> {
    const row = await this.attempts.findOneBy({ email, ip });
    return this.secondsUntil(row?.blockedUntil ?? null);
  }

  /** Soma um erro, de forma atômica. Devolve os segundos de espera se este erro atingiu o limite, ou 0. */
  async recordFailure(email: string, ip: string): Promise<number> {
    const now = new Date(this.clock.now());
    const waitUntil = new Date(now.getTime() + LOGIN_WAIT_MS);
    const [row] = (await this.dataSource.query(
      `INSERT INTO login_attempts (id, email, ip, failures, blocked_until, last_failure_at)
       VALUES ($1, $2, $3, 1, NULL, $4)
       ON CONFLICT (email, ip) DO UPDATE SET
         failures = CASE
           WHEN login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until <= $4 THEN 1
           ELSE login_attempts.failures + 1 END,
         blocked_until = CASE
           WHEN login_attempts.blocked_until IS NOT NULL AND login_attempts.blocked_until > $4 THEN login_attempts.blocked_until
           WHEN (CASE WHEN login_attempts.blocked_until IS NOT NULL THEN 1 ELSE login_attempts.failures + 1 END) >= $5 THEN $6::timestamptz
           ELSE NULL END,
         last_failure_at = $4,
         updated_at = $4
       RETURNING blocked_until`,
      [uuidv7(), email, ip, now, LOGIN_MAX_FAILURES, waitUntil],
    )) as { blocked_until: Date | null }[];
    return this.secondsUntil(row?.blocked_until ?? null);
  }

  async reset(email: string, ip: string): Promise<void> {
    await this.attempts.delete({ email, ip });
  }

  private secondsUntil(date: Date | null): number {
    if (!date) return 0;
    const ms = date.getTime() - this.clock.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }
}
