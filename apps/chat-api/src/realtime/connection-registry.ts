import { Injectable } from '@nestjs/common';
import { type ChatEvent, SERVER_MESSAGES, isLiveOnly } from 'chat-events';
import type { Server, Socket } from 'socket.io';

/** Uma conexão aberta de uma aba. Com `buffer`, a reposição está em curso: os eventos ao vivo esperam nele. */
export interface Connection {
  socket: Socket;
  personId: string;
  sessionId: string;
  buffer: ChatEvent[] | null;
}

/** A sala de todas as abas de uma pessoa (LLD, seção 2, "Eventos por pessoa (Redis)"). */
export const personRoom = (personId: string) => `pessoa:${personId}`;
/** Sala das abas da pessoa que ainda repõem eventos: ficam fora da entrega ao vivo e recebem os eventos pelo `buffer`. */
export const replayRoom = (personId: string) => `reposicao:${personId}`;

/** As conexões abertas, por pessoa, e a entrega às salas. O registro em memória guarda o `buffer` de quem repõe; uma instância só da API (HLD, seção 6.2). */
@Injectable()
export class ConnectionRegistry {
  private readonly byPerson = new Map<string, Set<Connection>>();
  private server?: Pick<Server, 'to'>;

  /** Liga o registro ao servidor Socket.IO, de onde saem as emissões às salas. */
  attach(server: Pick<Server, 'to'>) {
    this.server = server;
  }

  add(connection: Connection) {
    const set = this.byPerson.get(connection.personId) ?? new Set();
    set.add(connection);
    this.byPerson.set(connection.personId, set);
  }

  remove(connection: Connection) {
    const set = this.byPerson.get(connection.personId);
    set?.delete(connection);
    if (set?.size === 0) this.byPerson.delete(connection.personId);
  }

  all(): Connection[] {
    return [...this.byPerson.values()].flatMap((set) => [...set]);
  }

  /** Entrega à sala da pessoa, menos às abas em reposição, que guardam o evento no `buffer` até terminar. */
  deliver(personId: string, event: ChatEvent) {
    // O evento só ao vivo não espera a reposição: repô-lo depois seria mentira, e o identificador dele não é ponto de reposição.
    if (!isLiveOnly(event.tipo)) {
      for (const connection of this.byPerson.get(personId) ?? []) connection.buffer?.push(event);
    }
    this.server?.to(personRoom(personId)).except(replayRoom(personId)).emit(SERVER_MESSAGES.event, event);
  }
}
