import { Injectable } from '@nestjs/common';
import { type ChatEvent, type ChatEventDraft, chatEventDraftSchema } from 'chat-events';
import { ConnectionRegistry } from './connection-registry.js';
import { PersonEventsStore } from './person-events.store.js';

/**
 * A interface única de publicação (LLD, seção 2): guarda o evento da pessoa e o entrega às abas dela.
 * Quem chama publica só depois do commit da gravação que o causou (ADR 0025) e escolhe os destinatários.
 */
@Injectable()
export class EventPublisher {
  /** A cauda da fila de cada pessoa: a ordem de saída é a ordem de gravação. */
  private readonly queues = new Map<string, Promise<unknown>>();

  constructor(
    private readonly store: PersonEventsStore,
    private readonly connections: ConnectionRegistry,
  ) {}

  /** Rejeita um evento fora do formato antes de qualquer saída. Redis fora não rejeita: o evento sai ao vivo. */
  async publish(personId: string, draft: ChatEventDraft): Promise<ChatEvent> {
    const valid = chatEventDraftSchema.parse(draft);
    const previous = this.queues.get(personId) ?? Promise.resolve();
    const run = previous.then(async () => {
      const event = await this.store.append(personId, valid);
      this.connections.deliver(personId, event);
      return event;
    });
    const tail = run.catch(() => undefined);
    this.queues.set(personId, tail);
    void tail.then(() => {
      if (this.queues.get(personId) === tail) this.queues.delete(personId);
    });
    return run;
  }
}
