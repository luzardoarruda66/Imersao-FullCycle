import { type INestApplication, StandardSchemaValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Env } from './config/env.js';
import { AppError } from './errors/app-error.js';

/** Configuração compartilhada pelo `main.ts`, pelos testes E2E e pela geração do snapshot OpenAPI. */
export function configureApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  (app as NestExpressApplication).set('trust proxy', config.get('TRUSTED_PROXY'));
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new StandardSchemaValidationPipe({
      transform: true,
      exceptionFactory: (issues) =>
        new AppError('dados_invalidos', 400, 'Dados inválidos.', {
          campos: issues.map((issue) => ({
            campo: (issue.path ?? []).map((part) => (typeof part === 'object' ? part.key : part)).join('.'),
            mensagem: issue.message,
          })),
        }),
    }),
  );
}
