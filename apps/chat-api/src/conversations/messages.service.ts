import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { ChatMessage, ReadCounts } from 'chat-events';
import { DataSource, type EntityManager } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { MESSAGES_PER_PAGE } from '../config/values.js';
import { MessageEntity } from '../database/entities/message.entity.js';
import { AppError } from '../errors/app-error.js';
import { ConversationAccessService } from './conversation-access.service.js';
import { ConversationEvents } from './conversation-events.service.js';

export interface MessagePage {
  mensagens: ChatMessage[];
  /** Há mensagens anteriores às devolvidas. */
  tem_mais: boolean;
}

const invalidField = (campo: string, mensagem: string) =>
  new AppError('dados_invalidos', 400, 'Dados inválidos.', { campos: [{ campo, mensagem }] });

@Injectable()
export class MessagesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly access: ConversationAccessService,
    private readonly events: ConversationEvents,
  ) {}

  /**
   * Uma página do histórico, da mais antiga para a mais nova: as mais recentes sem `before`, ou as imediatamente
   * anteriores à mensagem `before`. A âncora é a posição (data e id) da mensagem, e não um deslocamento, para
   * mensagem nova não deslocar a página (LLD, "Interfaces").
   */
  async page(conversationId: string, personId: string, before?: string): Promise<MessagePage> {
    const conversation = await this.access.requireAccess(conversationId, personId);
    if (before !== undefined) await this.requireMessageOf(this.dataSource.manager, conversation.id, before, 'antes');
    const rows = await this.dataSource.query<MessageRow[]>(
      `SELECT m.id, m.text, m.created_at, p.id AS author_id, p.name AS author_name, p.username AS author_username
         FROM messages m JOIN people p ON p.id = m.author_id
        WHERE m.conversation_id = $1
          AND ($2::uuid IS NULL OR (m.created_at, m.id) < (SELECT a.created_at, a.id FROM messages a WHERE a.id = $2))
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT $3`,
      [conversation.id, before ?? null, MESSAGES_PER_PAGE + 1],
    );
    const hasMore = rows.length > MESSAGES_PER_PAGE;
    const page = rows.slice(0, MESSAGES_PER_PAGE).reverse();
    return { mensagens: page.map((row) => toChatMessage(conversation.id, row)), tem_mais: hasMore };
  }

  /**
   * Grava a mensagem e soma 1 a `nao_lidas` de cada participante que não é o autor, na mesma transação e num único
   * comando (incremento no próprio `UPDATE`, sem ler antes). O evento sai só depois do commit (ADR 0025).
   */
  async send(conversationId: string, authorId: string, text: string): Promise<ChatMessage> {
    const conversation = await this.access.requireAccess(conversationId, authorId);
    const everyone = await this.access.participantIds(conversation);
    // Ordem fixa: duas transações que somam nas mesmas linhas as travam na mesma ordem, sem impasse.
    const others = everyone.filter((id) => id !== authorId).sort();
    const id = uuidv7();
    const createdAt = new Date();

    const { message, counts } = await this.dataSource.transaction(async (manager) => {
      const [author] = await manager.query<{ name: string; username: string }[]>(
        `SELECT name, username FROM people WHERE id = $1`,
        [authorId],
      );
      await manager.insert(MessageEntity, { id, conversationId: conversation.id, authorId, text, createdAt });
      const counts = new Map<string, ReadCounts>();
      if (others.length > 0) {
        const rows = await manager.query<CountRow[]>(
          `INSERT INTO conversation_read_states AS rs (conversation_id, person_id, unread_count)
           SELECT $1, p, 1 FROM unnest($2::uuid[]) AS p ORDER BY p
           ON CONFLICT (conversation_id, person_id)
           DO UPDATE SET unread_count = rs.unread_count + 1, updated_at = now()
           RETURNING person_id, unread_count, mention_count`,
          [conversation.id, others],
        );
        for (const row of rows) counts.set(row.person_id, toCounts(row));
      }
      const [own] = await manager.query<CountRow[]>(
        `SELECT person_id, unread_count, mention_count FROM conversation_read_states
          WHERE conversation_id = $1 AND person_id = $2`,
        [conversation.id, authorId],
      );
      counts.set(authorId, own ? toCounts(own) : { nao_lidas: 0, mencoes: 0 });
      const message = toChatMessage(conversation.id, {
        id,
        text,
        created_at: createdAt,
        author_id: authorId,
        author_name: author!.name,
        author_username: author!.username,
      });
      return { message, counts };
    });

    // A publicação nunca derruba o envio: o dado já está gravado.
    await this.events.messageCreated(conversation, message, [...new Set([...everyone, authorId])], (personId) => counts.get(personId) ?? { nao_lidas: 0, mencoes: 0 });
    return message;
  }

  /**
   * Registra a leitura até a mensagem `messageId`. A posição só avança: uma igual ou anterior à gravada não muda
   * nada e não publica evento. Quando avança, a mesma transação grava a posição e recalcula `nao_lidas` como o
   * número de mensagens de outras pessoas depois dela (LLD, "Concorrência e idempotência").
   */
  async markRead(conversationId: string, personId: string, messageId: string): Promise<ReadCounts> {
    const conversation = await this.access.requireAccess(conversationId, personId);
    const { counts, advanced } = await this.dataSource.transaction(async (manager) => {
      await this.requireMessageOf(manager, conversation.id, messageId, 'mensagem_id');
      await manager.query(
        `INSERT INTO conversation_read_states (conversation_id, person_id) VALUES ($1, $2)
         ON CONFLICT (conversation_id, person_id) DO NOTHING`,
        [conversation.id, personId],
      );
      // Trava a linha antes de contar: o comando seguinte lê um retrato novo, que já inclui a mensagem que
      // estava sendo gravada e fez esta leitura esperar (em READ COMMITTED, cada comando tem o seu retrato).
      await manager.query(
        `SELECT 1 FROM conversation_read_states WHERE conversation_id = $1 AND person_id = $2 FOR UPDATE`,
        [conversation.id, personId],
      );
      const updated = await manager.query<CountRow[]>(
        `UPDATE conversation_read_states rs
            SET last_read_message_id = $3,
                unread_count = (
                  SELECT count(*)::int FROM messages m
                   WHERE m.conversation_id = $1 AND m.author_id <> $2
                     AND (m.created_at, m.id) > (SELECT a.created_at, a.id FROM messages a WHERE a.id = $3)),
                mention_count = 0,
                updated_at = now()
          WHERE rs.conversation_id = $1 AND rs.person_id = $2
            AND (rs.last_read_message_id IS NULL
                 OR (SELECT (c.created_at, c.id) FROM messages c WHERE c.id = rs.last_read_message_id)
                  < (SELECT (a.created_at, a.id) FROM messages a WHERE a.id = $3))
        RETURNING person_id, unread_count, mention_count`,
        [conversation.id, personId, messageId],
      );
      // O driver devolve `[linhas, quantidade]` no UPDATE ... RETURNING.
      const rows = (Array.isArray(updated[0]) ? updated[0] : updated) as CountRow[];
      if (rows.length > 0) return { counts: toCounts(rows[0]!), advanced: true };
      const [current] = await manager.query<CountRow[]>(
        `SELECT person_id, unread_count, mention_count FROM conversation_read_states WHERE conversation_id = $1 AND person_id = $2`,
        [conversation.id, personId],
      );
      return { counts: toCounts(current!), advanced: false };
    });
    if (advanced) await this.events.readCountsChanged(personId, conversation.id, counts);
    return counts;
  }

  private async requireMessageOf(manager: EntityManager, conversationId: string, messageId: string, field: string) {
    const found = await manager.query<{ id: string }[]>(
      `SELECT id FROM messages WHERE id = $1 AND conversation_id = $2`,
      [messageId, conversationId],
    );
    if (found.length === 0) throw invalidField(field, 'A mensagem não é desta conversa.');
  }
}

interface MessageRow {
  id: string;
  text: string;
  created_at: Date;
  author_id: string;
  author_name: string;
  author_username: string;
}

interface CountRow {
  person_id: string;
  unread_count: number;
  mention_count: number;
}

const toCounts = (row: CountRow): ReadCounts => ({ nao_lidas: row.unread_count, mencoes: row.mention_count });

function toChatMessage(conversationId: string, row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversa_id: conversationId,
    autor: { id: row.author_id, nome: row.author_name, usuario: row.author_username },
    texto: row.text,
    criada_em: row.created_at.toISOString(),
  };
}
