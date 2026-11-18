import { HttpException } from '@nestjs/common';

/** Catálogo de códigos de erro desta entrega (LLD, seção 5, índice das rotas). */
export const ERROR_CODES = [
  'dados_invalidos',
  'credenciais_invalidas',
  'tentativas_demais',
  'sessao_invalida',
  'senha_atual_incorreta',
  'senha_fraca',
  'origem_invalida',
  'nao_encontrado',
  'erro_interno',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export class AppError extends HttpException {
  constructor(
    readonly code: ErrorCode,
    status: number,
    message: string,
    readonly details?: unknown,
  ) {
    super(message, status);
  }
}
