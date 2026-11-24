import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import type { ChatMessage } from 'chat-events';
import { DataSource, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { MESSAGES_PER_READ } from '../config/values.js';
import { MessageEntity } from '../database/entities/message.entity.js';
import { ConversationAccessService } from './conversation-access.service.js';
import { ConversationEvents } from './conversation-events.service.js';

@Injectable()
export class MessagesService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(MessageEntity) private readonly messages: Repository<MessageEntity>,
    private readonly access: ConversationAccessService,
    private readonly events: ConversationEvents,
  ) {}

  /** As mensagens mais recentes (até `MESSAGES_PER_READ`), da mais antiga para a mais nova. */
  async recent(conversationId: string, personId: string): Promise<{ mensagens: ChatMessage[] }> {
    const conversation = await this.access.requireAccess(conversationId, personId);
    const rows = await this.dataSource.query<MessageRow[]>(
      `SELECT m.id, m.text, m.created_at, p.id AS author_id, p.name AS author_name
         FROM messages m JOIN people p ON p.id = m.author_id
        WHERE m.conversation_id = $1
        ORDER BY m.created_at DESC, m.id DESC
        LIMIT $2`,
      [conversation.id, MESSAGES_PER_READ],
    );
    return { mensagens: rows.reverse().map((row) => toChatMessage(conversation.id, row)) };
  }

  async send(conversationId: string, author: { id: string; nome: string }, text: string): Promise<ChatMessage> {
    const conversation = await this.access.requireAccess(conversationId, author.id);
    const entity = this.messages.create({
      id: uuidv7(),
      conversationId: conversation.id,
      authorId: author.id,
      text,
      createdAt: new Date(),
    });
    await this.messages.insert(entity);
    const message = toChatMessage(conversation.id, {
      id: entity.id,
      text: entity.text,
      created_at: entity.createdAt,
      author_id: author.id,
      author_name: author.nome,
    });
    // Só depois da gravação confirmada (ADR 0025); a publicação nunca derruba o envio.
    await this.events.messageCreated(conversation, message);
    return message;
  }
}

interface MessageRow {
  id: string;
  text: string;
  created_at: Date;
  author_id: string;
  author_name: string;
}

function toChatMessage(conversationId: string, row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversa_id: conversationId,
    autor: { id: row.author_id, nome: row.author_name },
    texto: row.text,
    criada_em: row.created_at.toISOString(),
  };
}
