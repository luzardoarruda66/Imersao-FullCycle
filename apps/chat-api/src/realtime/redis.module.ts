import { Global, Inject, Injectable, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { Env } from '../config/env.js';

export const REDIS = Symbol('REDIS');

@Injectable()
class RedisShutdown implements OnApplicationShutdown {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async onApplicationShutdown() {
    this.redis.disconnect();
  }
}

/** Conexão única com o Redis, injetável. Não bloqueia a subida nem as chamadas: com o Redis fora, o comando falha rápido (LLD, "Eventos por pessoa"). */
@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: async (config: ConfigService<Env, true>) => {
        const redis = new Redis(config.get('REDIS_URL'), {
          // O chat nunca espera o Redis: falha o comando em vez de enfileirar até ele voltar.
          enableOfflineQueue: false,
          maxRetriesPerRequest: 1,
          retryStrategy: (times) => Math.min(times * 200, 2000),
        });
        // Sem ouvinte, o `error` do ioredis derrubaria o processo.
        redis.on('error', () => undefined);
        // Espera a primeira conexão por pouco tempo; se o Redis estiver fora, a app sobe mesmo assim.
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 3000);
          redis.once('ready', () => {
            clearTimeout(timer);
            resolve();
          });
        });
        return redis;
      },
    },
    RedisShutdown,
  ],
  exports: [REDIS],
})
export class RedisModule {}
