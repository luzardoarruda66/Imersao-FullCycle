import { Injectable } from '@nestjs/common';
import { type ChatEvent, type ChatEventDraft, chatEventDraftSchema, formatEventId, isLiveOnly } from 'chat-events';
import { ConnectionRegistry } from './connection-registry.js';
import { PersonEventsStore } from './person-events.store.js';

const LIVE_EPOCH = 'ao_vivo';

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

  private liveSeq = 0;

  /**
   * A variante sem guarda: entrega às abas abertas agora e não grava nada, então não entra na reposição depois de
   * uma queda. O identificador usa a época `ao_vivo`, que nunca serve de ponto de reposição.
   */
  publishLive(personId: string, draft: ChatEventDraft): ChatEvent {
    const valid = chatEventDraftSchema.parse(draft);
    const now = Date.now();
    const event = {
      id: formatEventId({ epoch: LIVE_EPOCH, time: now, seq: this.liveSeq++ }),
      tipo: valid.tipo,
      dados: valid.dados,
      momento: new Date(now).toISOString(),
    } as ChatEvent;
    this.connections.deliver(personId, event);
    return event;
  }

  /** Rejeita um evento fora do formato antes de qualquer saída. Redis fora não rejeita: o evento sai ao vivo. */
  async publish(personId: string, draft: ChatEventDraft): Promise<ChatEvent> {
    const valid = chatEventDraftSchema.parse(draft);
    if (isLiveOnly(valid.tipo)) return this.publishLive(personId, valid);
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
