import { PasswordHasher } from '@nestjs/authentication';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
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
  close: () => Promise<void>;
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
  return {
    app,
    clock,
    people: app.get(PeopleService),
    dataSource,
    http: () => request(app.getHttpServer()),
    close: () => app.close(),
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
