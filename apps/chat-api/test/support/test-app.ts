import { PasswordHasher } from '@nestjs/authentication';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { io, type Socket } from 'socket.io-client';
import type { Redis } from 'ioredis';
import { REDIS } from '../../src/realtime/redis.module.js';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { PeopleService } from '../../src/accounts/people.service.js';
import { Clock } from '../../src/clock.js';
import { SESSION_COOKIE_NAME } from '../../src/config/values.js';

export class TestClock extends Clock {
  private current = Date.now();
  now() {
    return this.current;
  }
  advance(ms: number) {
    this.current += ms;
  }
}

export interface TestApp {
  app: INestApplication;
  clock: TestClock;
  people: PeopleService;
  dataSource: DataSource;
  http: () => ReturnType<typeof request>;
  redis: Redis;
  /** Espera o cliente do Redis voltar a responder depois de `redis.connect()`. */
  waitRedis: () => Promise<void>;
  /** Põe a app para escutar de verdade e devolve um cliente Socket.IO conectado (ou recusado) com o cookie dado. */
  connect: (options?: ConnectOptions) => Promise<ClientConnection>;
  close: () => Promise<void>;
}

export interface ConnectOptions {
  cookie?: string;
  /** `undefined` usa a origem do produto; `null` omite o cabeçalho. */
  origin?: string | null;
  lastEvent?: string;
}

/** O que o cliente recebeu, na ordem, e como esperar por mais. */
export interface ClientConnection {
  socket: Socket;
  events: { id: string; tipo: string; dados: { mensagem: string }; momento: string }[];
  ready: { ultimo_evento: string | null }[];
  lost: number;
  /** O motivo do fechamento pelo servidor, quando houve. */
  disconnectReason?: string;
  refusal?: { code: string; message: string };
  waitFor: (predicate: () => boolean, timeoutMs?: number) => Promise<void>;
  close: () => void;
}

export const PASSWORD = 'Senha-Certa1';

export async function createTestApp(): Promise<TestApp> {
  const clock = new TestClock();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(clock)
    // Custo baixo do scrypt, senão a suíte fica lenta (.claude/rules/nestjs.md).
    .overrideProvider(PasswordHasher)
    .useValue(new PasswordHasher({ logN: 10 }))
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  const dataSource = app.get(DataSource);
  await dataSource.query('TRUNCATE people, sessions, login_attempts');
  const redis = app.get<Redis>(REDIS);
  await redis.flushdb();
  const clients: Socket[] = [];
  let url: string | undefined;
  const connect = async (options: ConnectOptions = {}) => {
    if (!url) {
      await app.listen(0, '127.0.0.1');
      url = await app.getUrl();
    }
    const origin = options.origin === undefined ? 'http://localhost:3000' : options.origin;
    const socket = io(url, {
      transports: ['websocket'],
      reconnection: false,
      forceNew: true,
      extraHeaders: { ...(options.cookie ? { cookie: options.cookie } : {}), ...(origin ? { origin } : {}) },
      auth: options.lastEvent === undefined ? {} : { ultimo_evento: options.lastEvent },
    });
    clients.push(socket);
    const conn: ClientConnection = {
      socket,
      events: [],
      ready: [],
      lost: 0,
      waitFor: async (predicate, timeoutMs = 8000) => {
        const deadline = Date.now() + timeoutMs;
        while (!predicate()) {
          if (Date.now() > deadline) throw new Error('Tempo esgotado esperando o cliente');
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      },
      close: () => socket.close(),
    };
    socket.on('evento', (event) => conn.events.push(event));
    socket.on('pronto', (message) => conn.ready.push(message));
    socket.on('perdido', () => conn.lost++);
    socket.on('disconnect', (reason) => (conn.disconnectReason = reason));
    socket.on('connect_error', (error: Error & { data?: { code: string; message: string } }) => {
      conn.refusal = error.data ?? { code: error.message, message: error.message };
    });
    await new Promise<void>((resolve) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', () => resolve());
    });
    return conn;
  };
  return {
    redis,
    waitRedis: async () => {
      for (let i = 0; i < 100; i++) {
        try {
          await redis.ping();
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }
    },
    connect,
    app,
    clock,
    people: app.get(PeopleService),
    dataSource,
    http: () => request(app.getHttpServer()),
    close: async () => {
      for (const client of clients) client.close();
      await app.close();
    },
  };
}

/** O valor `sid=...` do cookie de um `Set-Cookie`, pronto para o cabeçalho `Cookie`. */
export function sidFrom(response: { headers: Record<string, unknown> }): string | undefined {
  const raw = response.headers['set-cookie'] as string[] | string | undefined;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const header = list.find((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
  const pair = header?.split(';')[0];
  return pair && pair !== `${SESSION_COOKIE_NAME}=` ? pair : undefined;
}
