import type { ChatEvent } from 'chat-events';
import type { Socket } from 'socket.io';
import { type Connection, ConnectionRegistry } from './connection-registry.js';

const event = (id: string): ChatEvent => ({ id, tipo: 'diagnostico', dados: { mensagem: id }, momento: 'agora' });
const connection = (personId: string, buffer: ChatEvent[] | null = null) => {
  const emit = vi.fn();
  return { connection: { socket: { emit } as unknown as Socket, personId, sessionId: 's', buffer } satisfies Connection, emit };
};

/** Servidor falso: registra a sala, a sala excluída e o que foi emitido. */
function fakeServer() {
  const calls: { room: string; except?: string; message: string; payload: unknown }[] = [];
  const server = {
    to: (room: string) => ({
      except: (except: string) => ({
        emit: (message: string, payload: unknown) => void calls.push({ room, except, message, payload }),
      }),
    }),
  };
  return { server: server as never, calls };
}

describe('ConnectionRegistry.deliver', () => {
  it('emite à sala da pessoa, sem a sala de reposição', () => {
    const registry = new ConnectionRegistry();
    const { server, calls } = fakeServer();
    registry.attach(server);
    registry.deliver('ana', event('e-1-0'));
    expect(calls).toEqual([{ room: 'pessoa:ana', except: 'reposicao:ana', message: 'evento', payload: event('e-1-0') }]);
  });

  it('guarda no buffer só das conexões da pessoa que estão em reposição', () => {
    const registry = new ConnectionRegistry();
    registry.attach(fakeServer().server);
    const replaying = connection('ana', []);
    const live = connection('ana');
    const other = connection('bia', []);
    [replaying, live, other].forEach((c) => registry.add(c.connection));
    registry.deliver('ana', event('e-1-0'));
    expect(replaying.connection.buffer).toEqual([event('e-1-0')]);
    expect(live.connection.buffer).toBeNull();
    expect(other.connection.buffer).toEqual([]);
  });

  it('lista as conexões abertas e esquece a removida', () => {
    const registry = new ConnectionRegistry();
    const c = connection('ana');
    registry.add(c.connection);
    expect(registry.all()).toEqual([c.connection]);
    registry.remove(c.connection);
    expect(registry.all()).toEqual([]);
  });
});
