import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { ChatMessage, ReadCounts } from 'chat-events';
import { DataSource, type EntityManager } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { Clock } from '../clock.js';
import { EDIT_WINDOW_MS, MESSAGES_PER_PAGE, QUOTE_EXCERPT_MAX } from '../config/values.js';
import { MentionEntity } from '../database/entities/mention.entity.js';
import { MessageEntity } from '../database/entities/message.entity.js';
import { AppError } from '../errors/app-error.js';
import { ConversationAccessService, UUID } from './conversation-access.service.js';
import { ConversationEvents } from './conversation-events.service.js';
import { MentionsService, type MentionRef } from './mentions.service.js';

export interface MessagePage {
  mensagens: ChatMessage[];
  /** Há mensagens anteriores às devolvidas. */
  tem_mais: boolean;
}

const messageNotFound = () => new AppError('mensagem_inexistente', 404, 'Mensagem não encontrada.');

const invalidField = (campo: string, mensagem: string) =>
  new AppError('dados_invalidos', 400, 'Dados inválidos.', { campos: [{ campo, mensagem }] });

@Injectable()
export class MessagesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly access: ConversationAccessService,
    private readonly events: ConversationEvents,
    private readonly mentions: MentionsService,
    private readonly clock: Clock,
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
      `SELECT m.id, m.text, m.created_at, m.edited_at, p.id AS author_id, p.name AS author_name, p.username AS author_username,
              q.id AS quote_id, q.text AS quote_text, q.deleted_at AS quote_deleted_at,
              qa.id AS quote_author_id, qa.name AS quote_author_name, qa.username AS quote_author_username
         FROM messages m JOIN people p ON p.id = m.author_id
         LEFT JOIN messages q ON q.id = m.quoted_message_id
         LEFT JOIN people qa ON qa.id = q.author_id
        WHERE m.conversation_id = $1
          AND ($2::uuid IS NULL OR (m.created_at, m.id) < (SELECT a.created_at, a.id FROM messages a WHERE a.id = $2))
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT $3`,
      [conversation.id, before ?? null, MESSAGES_PER_PAGE + 1],
    );
    const hasMore = rows.length > MESSAGES_PER_PAGE;
    const page = rows.slice(0, MESSAGES_PER_PAGE).reverse();
    const mentionsOf = await this.mentions.forMessages(page.map((row) => row.id));
    return { mensagens: page.map((row) => toChatMessage(conversation.id, row, mentionsOf.get(row.id) ?? [])), tem_mais: hasMore };
  }

  /**
   * Grava a mensagem e as menções e soma 1 a `nao_lidas` de cada participante que não é o autor, e 1 a `mencoes` de
   * cada mencionado, na mesma transação e num único comando (incremento no próprio `UPDATE`, sem ler antes). O evento
   * sai só depois do commit (ADR 0025).
   */
  async send(conversationId: string, authorId: string, text: string, quoteId?: string): Promise<ChatMessage> {
    const conversation = await this.access.requireAccess(conversationId, authorId);
    const everyone = await this.access.participantIds(conversation);
    // Ordem fixa: duas transações que somam nas mesmas linhas as travam na mesma ordem, sem impasse.
    const others = everyone.filter((id) => id !== authorId).sort();
    const mentioned = await this.mentions.resolve(everyone, authorId, text);
    const mentionedIds = new Set(mentioned.map((mention) => mention.id));
    const id = uuidv7();
    const createdAt = new Date();

    const { message, counts } = await this.dataSource.transaction(async (manager) => {
      // A citada é lida e travada para compartilhar na transação: uma exclusão que chegue agora espera a mensagem entrar.
      const quote = quoteId === undefined ? null : await this.requireQuotable(manager, conversation.id, quoteId);
      const [author] = await manager.query<{ name: string; username: string }[]>(
        `SELECT name, username FROM people WHERE id = $1`,
        [authorId],
      );
      await manager.insert(MessageEntity, { id, conversationId: conversation.id, authorId, text, createdAt, quotedMessageId: quote?.id ?? null });
      if (mentioned.length > 0) {
        await manager.insert(MentionEntity, mentioned.map((mention) => ({ messageId: id, personId: mention.id, createdAt })));
      }
      const counts = new Map<string, ReadCounts>();
      if (others.length > 0) {
        const rows = await manager.query<CountRow[]>(
          `INSERT INTO conversation_read_states AS rs (conversation_id, person_id, unread_count, mention_count)
           SELECT $1, t.person, 1, t.mention FROM unnest($2::uuid[], $3::int[]) AS t(person, mention) ORDER BY t.person
           ON CONFLICT (conversation_id, person_id)
           DO UPDATE SET unread_count = rs.unread_count + 1, mention_count = rs.mention_count + EXCLUDED.mention_count,
                         updated_at = now()
           RETURNING person_id, unread_count, mention_count`,
          [conversation.id, others, others.map((personId) => (mentionedIds.has(personId) ? 1 : 0))],
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
        ...quoteColumns(quote),
      }, mentioned);
      return { message, counts };
    });

    // A publicação nunca derruba o envio: o dado já está gravado.
    await this.events.messageCreated(conversation, message, [...new Set([...everyone, authorId])], (personId) => counts.get(personId) ?? { nao_lidas: 0, mencoes: 0 });
    return message;
  }

  /**
   * Edita o texto da própria mensagem (LLD, "Concorrência e idempotência"). Só o autor, até `EDIT_WINDOW_MS` depois do
   * envio, e nunca uma mensagem apagada. Texto igual ao gravado não muda nada nem publica. Quando muda, a mesma
   * transação grava o texto e `edited_at`, recalcula as menções e ajusta `mencoes` só de quem ainda não leu a mensagem
   * (quem leu já passou da posição que o contador conta). O evento sai só depois do commit (ADR 0025).
   */
  async edit(conversationId: string, personId: string, messageId: string, text: string): Promise<ChatMessage> {
    const conversation = await this.access.requireAccess(conversationId, personId);
    if (!UUID.test(messageId)) throw messageNotFound();
    const everyone = await this.access.participantIds(conversation);

    // `null` quando o texto é igual ao gravado (nada muda); senão, as contagens novas de quem teve o contador alterado.
    const countsChanged = await this.dataSource.transaction(async (manager) => {
      const [row] = await manager.query<{ text: string; created_at: Date; author_id: string; deleted_at: Date | null }[]>(
        `SELECT text, created_at, author_id, deleted_at FROM messages WHERE id = $1 AND conversation_id = $2 FOR UPDATE`,
        [messageId, conversation.id],
      );
      if (!row) throw messageNotFound();
      if (row.author_id !== personId) throw new AppError('mensagem_de_outra_pessoa', 403, 'Só quem escreveu a mensagem pode editá-la.');
      if (row.deleted_at !== null) throw new AppError('mensagem_apagada', 422, 'Esta mensagem foi apagada.');
      if (this.clock.now() - row.created_at.getTime() > EDIT_WINDOW_MS) {
        throw new AppError('prazo_encerrado', 422, 'O prazo para editar esta mensagem acabou.', { prazo_segundos: EDIT_WINDOW_MS / 1000 });
      }
      if (row.text === text) return null;

      const mentioned = (await this.mentions.resolve(everyone, personId, text)).map((mention) => mention.id);
      const stored = (await manager.query<{ person_id: string }[]>(`SELECT person_id FROM mentions WHERE message_id = $1`, [messageId])).map((r) => r.person_id);
      const added = mentioned.filter((id) => !stored.includes(id)).sort();
      const removed = stored.filter((id) => !mentioned.includes(id)).sort();

      await manager.update(MessageEntity, messageId, { text, editedAt: new Date(this.clock.now()) });
      if (added.length > 0) await manager.insert(MentionEntity, added.map((id) => ({ messageId, personId: id })));
      if (removed.length > 0) await manager.query(`DELETE FROM mentions WHERE message_id = $1 AND person_id = ANY($2::uuid[])`, [messageId, removed]);

      return this.adjustMentionCounts(manager, conversation.id, messageId, added, removed);
    });

    const message = await this.messageById(conversation.id, messageId);
    if (countsChanged === null) return message;
    await this.events.messageEdited(conversation, message, everyone);
    await Promise.all([...countsChanged].map(([id, counts]) => this.events.readCountsChanged(id, conversation.id, counts)));
    return message;
  }

  /**
   * Soma 1 a `mencoes` de quem passou a ser mencionado e desconta 1 de quem deixou de ser, só de quem ainda não leu a
   * mensagem (a posição de leitura é anterior a ela), nunca abaixo de zero. As linhas são travadas em ordem de pessoa,
   * como no envio, para duas transações nunca se esperarem em ciclo. Devolve as contagens de quem mudou.
   */
  private async adjustMentionCounts(
    manager: EntityManager,
    conversationId: string,
    messageId: string,
    added: string[],
    removed: string[],
  ): Promise<Map<string, ReadCounts>> {
    const counts = new Map<string, ReadCounts>();
    for (const [ids, delta] of [[added, 1], [removed, -1]] as const) {
      if (ids.length === 0) continue;
      const updated = await manager.query<CountRow[]>(
        `WITH locked AS (
           SELECT rs.person_id FROM conversation_read_states rs
            WHERE rs.conversation_id = $1 AND rs.person_id = ANY($2::uuid[])
              AND (rs.last_read_message_id IS NULL
                   OR (SELECT (c.created_at, c.id) FROM messages c WHERE c.id = rs.last_read_message_id)
                    < (SELECT (a.created_at, a.id) FROM messages a WHERE a.id = $3))
            ORDER BY rs.person_id
              FOR UPDATE)
         UPDATE conversation_read_states rs
            SET mention_count = GREATEST(rs.mention_count + $4, 0), updated_at = now()
           FROM locked
          WHERE rs.conversation_id = $1 AND rs.person_id = locked.person_id
      RETURNING rs.person_id, rs.unread_count, rs.mention_count`,
        [conversationId, ids, messageId, delta],
      );
      // O driver devolve `[linhas, quantidade]` no UPDATE ... RETURNING.
      for (const r of (Array.isArray(updated[0]) ? updated[0] : updated) as CountRow[]) counts.set(r.person_id, toCounts(r));
    }
    return counts;
  }

  /** Uma mensagem no formato da API, com as menções e a citação. */
  private async messageById(conversationId: string, messageId: string): Promise<ChatMessage> {
    const [row] = await this.dataSource.query<MessageRow[]>(
      `SELECT m.id, m.text, m.created_at, m.edited_at, p.id AS author_id, p.name AS author_name, p.username AS author_username,
              q.id AS quote_id, q.text AS quote_text, q.deleted_at AS quote_deleted_at,
              qa.id AS quote_author_id, qa.name AS quote_author_name, qa.username AS quote_author_username
         FROM messages m JOIN people p ON p.id = m.author_id
         LEFT JOIN messages q ON q.id = m.quoted_message_id
         LEFT JOIN people qa ON qa.id = q.author_id
        WHERE m.id = $1 AND m.conversation_id = $2`,
      [messageId, conversationId],
    );
    const mentionsOf = await this.mentions.forMessages([messageId]);
    return toChatMessage(conversationId, row!, mentionsOf.get(messageId) ?? []);
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
                mention_count = (
                  SELECT count(*)::int FROM mentions mn JOIN messages m ON m.id = mn.message_id
                   WHERE mn.person_id = $2 AND m.conversation_id = $1
                     AND (m.created_at, m.id) > (SELECT a.created_at, a.id FROM messages a WHERE a.id = $3)),
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

  /** A mensagem citada: da mesma conversa e ainda não apagada. Qualquer outra coisa é `dados_invalidos`, sem dizer qual. */
  private async requireQuotable(manager: EntityManager, conversationId: string, quoteId: string): Promise<QuoteSource> {
    const [row] = await manager.query<QuoteSource[]>(
      `SELECT q.id, q.text, q.deleted_at, a.id AS author_id, a.name AS author_name, a.username AS author_username
         FROM messages q JOIN people a ON a.id = q.author_id
        WHERE q.id = $1 AND q.conversation_id = $2
          FOR SHARE OF q`,
      [quoteId, conversationId],
    );
    if (!row || row.deleted_at !== null) throw invalidField('citacao_id', 'A mensagem citada não existe nesta conversa.');
    return row;
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
  edited_at?: Date | null;
  author_id: string;
  author_name: string;
  author_username: string;
  quote_id?: string | null;
  quote_text?: string | null;
  quote_deleted_at?: Date | null;
  quote_author_id?: string | null;
  quote_author_name?: string | null;
  quote_author_username?: string | null;
}

/** A mensagem citada como o banco a devolve ao conferir o envio. */
interface QuoteSource {
  id: string;
  text: string;
  deleted_at: Date | null;
  author_id: string;
  author_name: string;
  author_username: string;
}

/** Os campos da citação no formato das linhas de mensagem. */
const quoteColumns = (quote: QuoteSource | null): Partial<MessageRow> =>
  quote
    ? {
        quote_id: quote.id,
        quote_text: quote.text,
        quote_deleted_at: quote.deleted_at,
        quote_author_id: quote.author_id,
        quote_author_name: quote.author_name,
        quote_author_username: quote.author_username,
      }
    : {};

/** O trecho da citação: até `QUOTE_EXCERPT_MAX` caracteres (de verdade, sem partir um emoji), com reticências se cortou. */
function excerptOf(text: string): string {
  const characters = Array.from(text);
  return characters.length <= QUOTE_EXCERPT_MAX ? text : `${characters.slice(0, QUOTE_EXCERPT_MAX).join('')}…`;
}

function toQuote(row: MessageRow): ChatMessage['citacao'] {
  if (!row.quote_id) return null;
  const deleted = row.quote_deleted_at !== null && row.quote_deleted_at !== undefined;
  return {
    id: row.quote_id,
    autor: { id: row.quote_author_id!, nome: row.quote_author_name!, usuario: row.quote_author_username! },
    // O texto de uma mensagem apagada nunca sai pela citação.
    trecho: deleted ? '' : excerptOf(row.quote_text ?? ''),
    apagada: deleted,
  };
}

interface CountRow {
  person_id: string;
  unread_count: number;
  mention_count: number;
}

const toCounts = (row: CountRow): ReadCounts => ({ nao_lidas: row.unread_count, mencoes: row.mention_count });

function toChatMessage(conversationId: string, row: MessageRow, mencoes: MentionRef[] = []): ChatMessage {
  return {
    id: row.id,
    conversa_id: conversationId,
    autor: { id: row.author_id, nome: row.author_name, usuario: row.author_username },
    texto: row.text,
    criada_em: row.created_at.toISOString(),
    mencoes,
    citacao: toQuote(row),
    editada_em: row.edited_at ? row.edited_at.toISOString() : null,
    // Preenchido pela tarefa de exclusão da F1-05.
    apagada: false,
  };
}
