import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConversationParticipantEntity } from '../database/entities/conversation-participant.entity.js';
import { ConversationEntity } from '../database/entities/conversation.entity.js';
import { PersonEntity } from '../database/entities/person.entity.js';
import { AppError } from '../errors/app-error.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const conversationNotFound = () => new AppError('conversa_inexistente', 404, 'Conversa não encontrada.');

/**
 * O serviço único de participação (LLD, "Segurança"): toda rota que lê ou escreve numa conversa
 * passa por aqui. Quem não participa de canal privado ou de conversa direta recebe a mesma resposta
 * de um id que nunca existiu, para a resposta não revelar que o canal existe. Canal público não exige convite.
 */
@Injectable()
export class ConversationAccessService {
  constructor(
    @InjectRepository(ConversationEntity) private readonly conversations: Repository<ConversationEntity>,
    @InjectRepository(ConversationParticipantEntity)
    private readonly participants: Repository<ConversationParticipantEntity>,
    @InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>,
  ) {}

  async requireAccess(conversationId: string, personId: string): Promise<ConversationEntity> {
    if (!UUID.test(conversationId)) throw conversationNotFound();
    const conversation = await this.conversations.findOneBy({ id: conversationId });
    if (!conversation) throw conversationNotFound();
    if (conversation.type === 'canal_publico') return conversation;
    const participates = await this.participants.existsBy({ conversationId, personId });
    if (!participates) throw conversationNotFound();
    return conversation;
  }

  /** Quem participa da conversa: todos os membros no canal público (a F1-02 não grava os participantes dele), os participantes no resto. */
  async participantIds(conversation: Pick<ConversationEntity, 'id' | 'type'>): Promise<string[]> {
    if (conversation.type === 'canal_publico') {
      return (await this.people.find({ select: { id: true } })).map((row) => row.id);
    }
    return (await this.participants.find({ where: { conversationId: conversation.id } })).map((row) => row.personId);
  }
}
