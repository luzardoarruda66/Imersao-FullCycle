import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AuthenticationModule } from '@nestjs/authentication';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountsModule } from './accounts/accounts.module.js';
import { AuthModule } from './auth/auth.module.js';
import { Clock } from './clock.js';
import { ClockModule } from './clock.module.js';
import { AppConfigModule } from './config/config.module.js';
import type { Env } from './config/env.js';
import {
  LOGIN_IP_CEILING,
  LOGIN_IP_CEILING_WINDOW_MS,
  SESSION_COOKIE_NAME,
  SESSION_DURATION,
} from './config/values.js';
import { buildDataSourceOptions } from './database/data-source.js';
import { AllExceptionsFilter } from './errors/all-exceptions.filter.js';
import { LoginAttemptsModule } from './login-attempts/login-attempts.module.js';

@Module({
  imports: [
    AppConfigModule,
    ClockModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => buildDataSourceOptions(config.get('DATABASE_URL')),
    }),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService, Clock],
      useFactory: (config: ConfigService<Env, true>, clock: Clock) => {
        const domain = config.get('COOKIE_DOMAIN');
        return {
          session: {
            cookieName: SESSION_COOKIE_NAME,
            // Vence depois da duração sem uso; sem teto absoluto: `absoluteTtl` no máximo (LLD, 6.2).
            idleTtl: SESSION_DURATION,
            absoluteTtl: '36500d',
            cookie: { secure: true, sameSite: 'lax' as const, path: '/', ...(domain ? { domain } : {}) },
            trustedOrigins: [config.get('WEB_ORIGIN')],
            now: () => clock.now(),
          },
        };
      },
    }),
    // Teto por IP na rota de entrar (`@UseGuards(ThrottlerGuard)` só lá).
    ThrottlerModule.forRoot([{ ttl: LOGIN_IP_CEILING_WINDOW_MS, limit: LOGIN_IP_CEILING }]),
    AccountsModule,
    LoginAttemptsModule,
    AuthModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
