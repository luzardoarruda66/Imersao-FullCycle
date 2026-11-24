import { Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsAuthenticator, type SessionRecord } from '@nestjs/authentication';
import { type OnGatewayConnection, type OnGatewayInit, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { SERVER_MESSAGES, handshakeAuthSchema } from 'chat-events';
import type { Server, Socket } from 'socket.io';
import { TypeOrmSessionStore } from '../auth/typeorm-session.store.js';
import type { Member } from '../auth/member.js';
import { Clock } from '../clock.js';
import type { Env } from '../config/env.js';
import { SESSION_CHECK_INTERVAL_MS, SESSION_IDLE_MS } from '../config/values.js';
import { ConnectionRegistry, type Connection, isAfter } from './connection-registry.js';
import { PersonEventsStore } from './person-events.store.js';

type RefusalCode = 'sessao_invalida' | 'origem_invalida';

function refuse(code: RefusalCode, message: string) {
  return Object.assign(new Error(code), { data: { code, message } });
}

/** Só o transporte WebSocket, sem polling (ADR 0019). A origem é conferida no handshake; o `cors` do Socket.IO só vale para o polling. */
@WebSocketGateway({ transports: ['websocket'] })
export class RealtimeGateway implements OnGatewayInit, OnGatewayConnection, OnModuleDestroy {
  private readonly logger = new Logger(RealtimeGateway.name);
  private timer?: NodeJS.Timeout;
  private checking = false;

  @WebSocketServer() server: Server;

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly wsAuth: WsAuthenticator,
    private readonly store: PersonEventsStore,
    private readonly connections: ConnectionRegistry,
    private readonly sessions: TypeOrmSessionStore,
    private readonly clock: Clock,
  ) {}

  afterInit(server: Server) {
    server.use((socket, next) => {
      this.authenticate(socket).then(() => next(), (error: Error) => next(error));
    });
    this.timer = setInterval(() => void this.checkSessions(), SESSION_CHECK_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  /** Origem do produto e sessão válida, nessa ordem; a recusa leva o código do catálogo. */
  private async authenticate(socket: Socket) {
    if (socket.handshake.headers.origin !== this.config.get('WEB_ORIGIN')) {
      throw refuse('origem_invalida', 'Origem não permitida.');
    }
    const result = await this.wsAuth.authenticateConnection(socket, undefined, { required: false });
    const member = result?.user as Member | undefined;
    const session = result?.session as SessionRecord | undefined;
    if (!session || !member) throw refuse('sessao_invalida', 'Sessão inválida.');
    socket.data = { personId: member.id, sessionId: session.id };
  }

  async handleConnection(socket: Socket) {
    const { personId, sessionId } = socket.data as { personId: string; sessionId: string };
    const connection: Connection = { socket, personId, sessionId, buffer: [] };
    this.connections.add(connection);
    socket.on('disconnect', () => this.connections.remove(connection));
    try {
      await this.start(connection, handshakeAuthSchema.safeParse(socket.handshake.auth).data?.ultimo_evento);
    } catch (error) {
      this.logger.error(`Falha ao iniciar a conexão: ${(error as Error).message}`);
      socket.disconnect(true);
    }
  }

  /** Primeira conexão da aba: `pronto` com o ponto de partida. Reconexão: reposição em ordem, com os eventos ao vivo guardados até o fim. */
  private async start(connection: Connection, lastEvent: string | undefined) {
    const { socket, personId } = connection;
    let reference: string | null;
    

    if (lastEvent === undefined) {
      reference = await this.store.currentId(personId);
    } else {
      const result = await this.store.readSince(personId, lastEvent);
      if (result.status === 'lost') {
        connection.buffer = null;
        if (socket.connected) socket.emit(SERVER_MESSAGES.lost, {});
        return;
      }
      reference = lastEvent;
      if (!socket.connected) return;
      for (const event of result.events) {
        socket.emit(SERVER_MESSAGES.event, event);
        reference = event.id;
      }
    }
    if (!socket.connected) return;

    const held = connection.buffer ?? [];
    connection.buffer = null;
    if (lastEvent === undefined) socket.emit(SERVER_MESSAGES.ready, { ultimo_evento: reference });
    for (const event of held) {
      if (reference === null || isAfter(event.id, reference)) {
        socket.emit(SERVER_MESSAGES.event, event);
        reference = event.id;
      }
    }
    if (lastEvent !== undefined) socket.emit(SERVER_MESSAGES.ready, { ultimo_evento: reference });
  }

  /** A cada intervalo, uma consulta só pelas sessões das conexões abertas; fecha as que não valem mais. A conferência não renova a sessão. */
  async checkSessions() {
    if (this.checking) return;
    this.checking = true;
    try {
      const open = this.connections.all();
      const ids = [...new Set(open.map((connection) => connection.sessionId))];
      const live = await this.sessions.liveSessionIds(ids, new Date(this.clock.now()), SESSION_IDLE_MS);
      for (const connection of open) {
        if (!live.has(connection.sessionId)) connection.socket.disconnect(true);
      }
    } catch (error) {
      this.logger.warn(`Conferência das sessões falhou: ${(error as Error).message}`);
    } finally {
      this.checking = false;
    }
  }
}
