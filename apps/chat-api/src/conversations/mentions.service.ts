import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, type EntityManager } from 'typeorm';
import { normalizeUsername } from '../accounts/username-rule.js';
import { PEOPLE_SEARCH_LIMIT } from '../config/values.js';
import { escapeLike } from '../people/like.js';
import type { PersonSummary } from '../people/directory.service.js';
import { ConversationAccessService } from './conversation-access.service.js';
import { mentionCandidates, resolveMentions } from './mention-parser.js';

/** Uma pessoa mencionada numa mensagem: o que o cliente precisa para destacar só as menções reais. */
export interface MentionRef {
  id: string;
  usuario: string;
}

const PLAIN_NAME = 'unaccent(lower(p.name))';

/**
 * As menções (LLD, "Concorrência e idempotência"): decide quem uma mensagem menciona, lê as menções gravadas e lista
 * quem pode ser mencionado. Quem pode ser mencionado é quem participa da conversa; o resto do `@` fica como texto.
 */
@Injectable()
export class MentionsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly access: ConversationAccessService,
  ) {}

  /**
   * Quem o texto menciona entre os participantes da conversa, na ordem em que aparece e sem o autor (ninguém é avisado
   * do que escreveu). Um `@` que não casa com participante não é menção.
   */
  async resolve(participantIds: string[], authorId: string, text: string): Promise<MentionRef[]> {
    const candidates = mentionCandidates(text);
    if (candidates.length === 0) return [];
    const rows = await this.dataSource.query<{ id: string; username: string }[]>(
      `SELECT id, username FROM people WHERE id = ANY($1::uuid[]) AND username = ANY($2::text[]) AND id <> $3`,
      [participantIds, candidates, authorId],
    );
    const byUsername = new Map(rows.map((row) => [row.username, row.id]));
    return resolveMentions(text, new Set(byUsername.keys())).map((usuario) => ({ id: byUsername.get(usuario)!, usuario }));
  }

  /** As menções gravadas de cada mensagem, na ordem do @usuário. */
  async forMessages(messageIds: string[], manager: EntityManager = this.dataSource.manager): Promise<Map<string, MentionRef[]>> {
    const byMessage = new Map<string, MentionRef[]>();
    if (messageIds.length === 0) return byMessage;
    const rows = await manager.query<{ message_id: string; id: string; username: string }[]>(
      `SELECT mn.message_id, p.id, p.username FROM mentions mn JOIN people p ON p.id = mn.person_id
        WHERE mn.message_id = ANY($1::uuid[]) ORDER BY mn.created_at, p.username`,
      [messageIds],
    );
    for (const row of rows) {
      const list = byMessage.get(row.message_id) ?? [];
      list.push({ id: row.id, usuario: row.username });
      byMessage.set(row.message_id, list);
    }
    return byMessage;
  }

  /**
   * Os participantes da conversa que a pessoa pode mencionar: menos ela mesma, por nome ou @usuário (sem diferenciar
   * maiúsculas e acentos; um `@` inicial é ignorado), ordenados por nome. Pelo serviço de participação.
   */
  async mentionable(conversationId: string, personId: string, term: string): Promise<PersonSummary[]> {
    const conversation = await this.access.requireAccess(conversationId, personId);
    const participantIds = await this.access.participantIds(conversation);
    const normalized = normalizeUsername(term);
    const params: unknown[] = [participantIds.filter((id) => id !== personId), PEOPLE_SEARCH_LIMIT];
    let filter = '';
    if (normalized) {
      params.push(escapeLike(normalized));
      const like = `'%' || unaccent(lower($3)) || '%' ESCAPE '\\'`;
      filter = `AND (${PLAIN_NAME} LIKE ${like} OR p.username LIKE ${like})`;
    }
    const rows = await this.dataSource.query<{ id: string; name: string; username: string }[]>(
      `SELECT p.id, p.name, p.username FROM people p WHERE p.id = ANY($1::uuid[]) ${filter}
        ORDER BY ${PLAIN_NAME}, p.id LIMIT $2`,
      params,
    );
    return rows.map((row) => ({ id: row.id, nome: row.name, usuario: row.username }));
  }
}
