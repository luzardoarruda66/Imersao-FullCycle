import { Injectable } from '@nestjs/common';
import { type ChatEvent, SERVER_MESSAGES, compareEventIds, parseEventId } from 'chat-events';
import type { Socket } from 'socket.io';

/** Uma conexão aberta de uma aba. Com `buffer`, a reposição está em curso: os eventos ao vivo esperam nele. */
export interface Connection {
  socket: Socket;
  personId: string;
  sessionId: string;
  buffer: ChatEvent[] | null;
}

/** Se `event` vem depois de `reference` na ordem da pessoa; identificadores de outra época não se comparam e valem como novos. */
export function isAfter(event: string, reference: string): boolean {
  const a = parseEventId(event);
  const b = parseEventId(reference);
  if (!a || !b || a.epoch !== b.epoch) return true;
  return compareEventIds(a, b) > 0;
}

/** As conexões abertas, por pessoa. Uma instância só da API (HLD, seção 6.2), então a memória basta. */
@Injectable()
export class ConnectionRegistry {
  private readonly byPerson = new Map<string, Set<Connection>>();

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

  /** Entrega ao vivo a todas as abas da pessoa; quem está em reposição guarda o evento. */
  deliver(personId: string, event: ChatEvent) {
    for (const connection of this.byPerson.get(personId) ?? []) {
      if (connection.buffer) connection.buffer.push(event);
      else connection.socket.emit(SERVER_MESSAGES.event, event);
    }
  }
}
