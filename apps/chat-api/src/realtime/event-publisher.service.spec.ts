import type { ChatEvent, ChatEventDraft } from 'chat-events';
import { ConnectionRegistry } from './connection-registry.js';
import { EventPublisher } from './event-publisher.service.js';
import type { PersonEventsStore } from './person-events.store.js';

describe('EventPublisher', () => {
  const draft = (mensagem: string): ChatEventDraft => ({ tipo: 'diagnostico', dados: { mensagem } });

  it('entrega na ordem em que publicou, mesmo que a primeira gravação demore mais', async () => {
    const delays: Record<string, number> = { primeiro: 30, segundo: 0 };
    let seq = 0;
    const store = {
      append: vi.fn(async (_person: string, d: ChatEventDraft) => {
        await new Promise((resolve) => setTimeout(resolve, delays[(d.dados as { mensagem: string }).mensagem] ?? 0));
        return { id: `e-1-${seq++}`, ...d, momento: 'agora' } as ChatEvent;
      }),
    } as unknown as PersonEventsStore;
    const delivered: string[] = [];
    const registry = new ConnectionRegistry();
    vi.spyOn(registry, 'deliver').mockImplementation((_p, e) => void delivered.push(e.id));
    const publisher = new EventPublisher(store, registry);

    await Promise.all([publisher.publish('ana', draft('primeiro')), publisher.publish('ana', draft('segundo'))]);
    expect(delivered).toEqual(['e-1-0', 'e-1-1']);
  });

  it('rejeita evento fora do formato sem gravar nem entregar', async () => {
    const append = vi.fn();
    const store = { append } as unknown as PersonEventsStore;
    const registry = new ConnectionRegistry();
    const deliver = vi.spyOn(registry, 'deliver');
    const publisher = new EventPublisher(store, registry);
    await expect(publisher.publish('ana', { tipo: 'outro', dados: {} } as never)).rejects.toThrow();
    expect(append).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });

  it('segue publicando depois de uma falha na entrega', async () => {
    const store = { append: vi.fn(async (_p: string, d: ChatEventDraft) => ({ id: 'e-1-0', ...d, momento: 'agora' })) } as unknown as PersonEventsStore;
    const registry = new ConnectionRegistry();
    vi.spyOn(registry, 'deliver').mockImplementationOnce(() => {
      throw new Error('falhou');
    });
    const publisher = new EventPublisher(store, registry);
    await expect(publisher.publish('ana', draft('a'))).rejects.toThrow('falhou');
    await expect(publisher.publish('ana', draft('b'))).resolves.toMatchObject({ id: 'e-1-0' });
  });
});
