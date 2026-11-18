import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ThrottlerException } from '@nestjs/throttler';
import { LOGIN_IP_CEILING_WINDOW_MS } from '../config/values.js';
import { AppError, type ErrorCode } from './app-error.js';

const BY_STATUS: Record<number, [ErrorCode, string]> = {
  400: ['dados_invalidos', 'Requisição inválida.'],
  401: ['sessao_invalida', 'Sessão inválida ou encerrada.'],
  403: ['origem_invalida', 'Origem não permitida.'],
  404: ['nao_encontrado', 'Recurso não encontrado.'],
  429: ['tentativas_demais', 'Tentativas demais.'],
};

/** Corpo único de erro (LLD, "Erros"): `{ error: { code, message, details } }`, inclusive para as exceções do framework. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.adapterHost;
    const response = host.switchToHttp().getResponse();
    const { status, code, message, details } = this.translate(exception, httpAdapter, response);
    httpAdapter.reply(response, { error: { code, message, details } }, status);
  }

  private translate(exception: unknown, httpAdapter: HttpAdapterHost['httpAdapter'], response: unknown) {
    if (exception instanceof AppError) {
      return { status: exception.getStatus(), code: exception.code, message: exception.message, details: exception.details };
    }
    if (exception instanceof ThrottlerException) {
      const header = Number(httpAdapter.getHeader(response, 'retry-after'));
      // Sem `Retry-After`, vale a janela inteira do teto por IP.
      const seconds = Number.isFinite(header) && header > 0 ? header : LOGIN_IP_CEILING_WINDOW_MS / 1000;
      this.logger.warn(`Tentativa de entrar bloqueada pelo teto por IP: segundos_restantes=${seconds}`);
      return {
        status: HttpStatus.TOO_MANY_REQUESTS,
        code: 'tentativas_demais' as const,
        message: 'Tentativas demais. Tente de novo mais tarde.',
        details: { segundos_restantes: seconds },
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const [code, message] = BY_STATUS[status] ?? (['dados_invalidos', 'Requisição inválida.'] as const);
      return { status, code, message, details: undefined };
    }
    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'erro_interno' as const,
      message: 'Erro interno.',
      details: undefined,
    };
  }
}
