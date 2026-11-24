import type { ChatEvent } from 'chat-events';
import type { Socket } from 'socket.io';
import { type Connection, ConnectionRegistry, isAfter } from './connection-registry.js';

const event = (id: string): ChatEvent => ({ id, tipo: 'diagnostico', dados: { mensagem: id }, momento: 'agora' });
const connection = (personId: string, buffer: ChatEvent[] | null = null) => {
  const emit = vi.fn();
  return { connection: { socket: { emit } as unknown as Socket, personId, sessionId: 's', buffer } satisfies Connection, emit };
};

describe('isAfter', () => {
  it('compara instante e sequência na mesma época', () => {
    expect(isAfter('e-10-1', 'e-10-0')).toBe(true);
    expect(isAfter('e-11-0', 'e-10-9')).toBe(true);
    expect(isAfter('e-10-1', 'e-10-1')).toBe(false);
    expect(isAfter('e-9-5', 'e-10-0')).toBe(false);
  });

  it('trata outra época ou identificador ilegível como novo', () => {
    expect(isAfter('x-1-0', 'e-10-0')).toBe(true);
    expect(isAfter('lixo', 'e-10-0')).toBe(true);
  });
});

describe('ConnectionRegistry.deliver', () => {
  it('entrega a todas as conexões da pessoa e a mais ninguém', () => {
    const registry = new ConnectionRegistry();
    const [a1, a2, b] = [connection('ana'), connection('ana'), connection('bia')];
    [a1, a2, b].forEach((c) => registry.add(c.connection));
    registry.deliver('ana', event('e-1-0'));
    expect(a1.emit).toHaveBeenCalledWith('evento', event('e-1-0'));
    expect(a2.emit).toHaveBeenCalledTimes(1);
    expect(b.emit).not.toHaveBeenCalled();
  });

  it('guarda no buffer enquanto a reposição está em curso', () => {
    const registry = new ConnectionRegistry();
    const held = connection('ana', []);
    registry.add(held.connection);
    registry.deliver('ana', event('e-1-0'));
    expect(held.emit).not.toHaveBeenCalled();
    expect(held.connection.buffer).toEqual([event('e-1-0')]);
  });

  it('para de entregar a conexão removida', () => {
    const registry = new ConnectionRegistry();
    const c = connection('ana');
    registry.add(c.connection);
    registry.remove(c.connection);
    registry.deliver('ana', event('e-1-0'));
    expect(c.emit).not.toHaveBeenCalled();
    expect(registry.all()).toEqual([]);
  });
});
