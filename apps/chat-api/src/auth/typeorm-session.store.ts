import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { AuthenticationStorage, type SessionRecord, type SessionStore } from '@nestjs/authentication';
import { DataSource, LessThan, LessThanOrEqual } from 'typeorm';
import { SessionEntity, type Json } from '../database/entities/session.entity.js';

/** `SessionStore` do `@nestjs/authentication` sobre o Banco do chat (ADR 0016). Cada método que decide "só uma vez" é um comando condicional só. */
@Injectable()
export class TypeOrmSessionStore implements SessionStore {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this });
  }

  private get manager() {
    return this.dataSource.manager;
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const row = await this.manager.findOneBy(SessionEntity, { id });
    return row ? toRecord(row) : undefined;
  }

  async createSession(record: SessionRecord): Promise<void> {
    const metadata = (record.metadata ?? null) as Record<string, Json> | null;
    await this.manager.insert(SessionEntity, { ...record, mfa: record.mfa ?? null, metadata });
    // Sessões vencidas não têm rotina: cada sessão nova apaga as vencidas (LLD, seção 7).
    await this.manager.delete(SessionEntity, { expiresAt: LessThanOrEqual(record.createdAt) });
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    // Condicional: uma sessão apagada por "sair" continua apagada.
    await this.manager.update(SessionEntity, { id, lastActiveAt: LessThan(lastActiveAt) }, { lastActiveAt, updatedAt: new Date() });
  }

  async deleteSession(id: string): Promise<boolean> {
    const { affected } = await this.manager.delete(SessionEntity, { id });
    return (affected ?? 0) > 0;
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const rows = await this.manager.findBy(SessionEntity, { userId });
    return rows.map(toRecord);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.manager.delete(SessionEntity, { userId });
  }
}

function toRecord(row: SessionEntity): SessionRecord {
  const { mfa, metadata, updatedAt: _updatedAt, ...rest } = row;
  return { ...rest, ...(mfa ? { mfa } : {}), ...(metadata ? { metadata } : {}) };
}
