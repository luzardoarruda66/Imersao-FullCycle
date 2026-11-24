import { Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CLIENT_MESSAGES, typingMessageSchema } from 'chat-events';
import { Repository } from 'typeorm';
import { Clock } from '../clock.js';
import { TYPING_MEMBER_LIMIT, TYPING_MIN_INTERVAL_MS } from '../config/values.js';
import { PersonEntity } from '../database/entities/person.entity.js';
import { AppError } from '../errors/app-error.js';
import { ClientMessageRouter } from '../realtime/client-message-router.js';
import { EventPublisher } from '../realtime/event-publisher.service.js';
import { ConversationAccessService } from './conversation-access.service.js';

/**
 * O "digitando": mensagem do cliente que a API repassa só ao vivo, sem guardar (LLD, "Interfaces"). Quem não
 * participa é ignorado sem resposta; o repetido da mesma pessoa e conversa em menos do intervalo mínimo também;
 * e em conversa com mais membros que o limite o aviso não sai.
 */
@Injectable()
export class TypingService implements OnModuleInit {
  /** O último "digitando" aceito, por pessoa e conversa. */
  private readonly lastSeen = new Map<string, number>();

  constructor(
    private readonly router: ClientMessageRouter,
    private readonly access: ConversationAccessService,
    private readonly publisher: EventPublisher,
    private readonly clock: Clock,
    @InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>,
  ) {}

  onModuleInit() {
    this.router.register(CLIENT_MESSAGES.typing, (personId, payload) => this.handle(personId, payload));
  }

  async handle(personId: string, payload: unknown) {
    const parsed = typingMessageSchema.safeParse(payload);
    if (!parsed.success) return;
    const conversation = await this.access.requireAccess(parsed.data.conversa_id, personId).catch((error: unknown) => {
      if (error instanceof AppError) return null;
      throw error;
    });
    if (!conversation) return;

    const key = `${personId}:${conversation.id}`;
    const now = this.clock.now();
    const last = this.lastSeen.get(key);
    if (last !== undefined && now - last < TYPING_MIN_INTERVAL_MS) return;
    this.remember(key, now);

    const everyone = await this.access.participantIds(conversation);
    if (everyone.length > TYPING_MEMBER_LIMIT) return;
    const typist = await this.people.findOne({ where: { id: personId }, select: { id: true, username: true } });
    if (!typist) return;
    for (const recipient of everyone) {
      if (recipient === personId) continue;
      this.publisher.publishLive(recipient, {
        tipo: 'digitando',
        dados: { conversa_id: conversation.id, pessoa: { id: typist.id, usuario: typist.username } },
      });
    }
  }

  /** Guarda o instante e descarta o que já passou do intervalo, para o mapa não crescer sem fim. */
  private remember(key: string, now: number) {
    this.lastSeen.set(key, now);
    if (this.lastSeen.size < 1000) return;
    for (const [other, at] of this.lastSeen) {
      if (now - at >= TYPING_MIN_INTERVAL_MS) this.lastSeen.delete(other);
    }
  }
}
