import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { ChatEventDraft, ChatMessage } from 'chat-events';
import { Repository } from 'typeorm';
import { ConversationParticipantEntity } from '../database/entities/conversation-participant.entity.js';
import type { ConversationEntity } from '../database/entities/conversation.entity.js';
import { PersonEntity } from '../database/entities/person.entity.js';
import { EventPublisher } from '../realtime/event-publisher.service.js';

/**
 * Publica os eventos das conversas, sempre depois do commit da gravação que os causou (ADR 0025).
 * Quem recebe cada evento é decidido aqui, pela regra de participação: o canal público alcança todos os
 * membros; o privado e a direta, só os participantes. Uma falha de publicação nunca derruba a requisição:
 * o dado já está gravado, e o cliente recupera pelo histórico (LLD, "Eventos por pessoa (Redis)").
 */
@Injectable()
export class ConversationEvents {
  private readonly logger = new Logger(ConversationEvents.name);

  constructor(
    private readonly publisher: EventPublisher,
    @InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>,
    @InjectRepository(ConversationParticipantEntity)
    private readonly participants: Repository<ConversationParticipantEntity>,
  ) {}

  /** Quem vê a conversa: todos os membros no canal público, os participantes no resto. */
  async recipientsOf(conversation: Pick<ConversationEntity, 'id' | 'type'>): Promise<string[]> {
    if (conversation.type === 'canal_publico') {
      const rows = await this.people.find({ select: { id: true } });
      return rows.map((row) => row.id);
    }
    const rows = await this.participants.find({ where: { conversationId: conversation.id } });
    return rows.map((row) => row.personId);
  }

  async messageCreated(conversation: Pick<ConversationEntity, 'id' | 'type'>, message: ChatMessage) {
    const recipients = await this.safely(() => this.recipientsOf(conversation));
    await this.publishAll(recipients, { tipo: 'mensagem_criada', dados: { conversa_id: conversation.id, mensagem: message } });
  }

  /** A conversa entrou na lista de cada pessoa dada. */
  conversationVisible(conversationId: string, personIds: string[]) {
    return this.publishAll(personIds, { tipo: 'conversa_visivel', dados: { conversa_id: conversationId } });
  }

  /** O canal público novo entrou na lista de todos os membros. */
  async publicChannelVisible(conversationId: string) {
    const recipients = await this.safely(async () => (await this.people.find({ select: { id: true } })).map((row) => row.id));
    await this.conversationVisible(conversationId, recipients);
  }

  private async safely<T>(run: () => Promise<T[]>): Promise<T[]> {
    try {
      return await run();
    } catch (error) {
      this.logger.warn(`Não foi possível decidir os destinatários do evento: ${String(error)}`);
      return [];
    }
  }

  private async publishAll(personIds: string[], draft: ChatEventDraft) {
    const results = await Promise.allSettled(personIds.map((personId) => this.publisher.publish(personId, draft)));
    const failed = results.filter((result) => result.status === 'rejected').length;
    if (failed > 0) this.logger.warn(`Evento ${draft.tipo} não saiu para ${failed} de ${personIds.length} pessoas.`);
  }
}
