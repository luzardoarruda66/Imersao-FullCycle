import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ERROR_CODES } from '../errors/app-error.js';

/** Gerado depois de `setGlobalPrefix`, senão os `paths` saem sem o `/v1`. */
export function buildOpenApiDocument(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('API do chat').setVersion('1').build());
  document.components ??= {};
  document.components.schemas = {
    ...document.components.schemas,
    ErroCodigo: { type: 'string', enum: [...ERROR_CODES] },
    Erro: {
      type: 'object',
      required: ['error'],
      properties: {
        error: {
          type: 'object',
          required: ['code', 'message'],
          properties: {
            code: { $ref: '#/components/schemas/ErroCodigo' },
            message: { type: 'string' },
            details: {},
          },
        },
      },
    },
    Membro: {
      type: 'object',
      required: ['id', 'email', 'nome', 'administrador', 'permissao_dados'],
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string' },
        nome: { type: 'string' },
        administrador: { type: 'boolean' },
        permissao_dados: { type: 'boolean' },
      },
    },
  };
  const error = (description: string) => ({
    description,
    content: { 'application/json': { schema: { $ref: '#/components/schemas/Erro' } } },
  });
  const member = { description: 'O membro', content: { 'application/json': { schema: { $ref: '#/components/schemas/Membro' } } } };
  const paths = document.paths;
  const set = (path: string, method: string, responses: Record<string, unknown>, body?: object) => {
    const op = (paths[path] as Record<string, any>)[method];
    op.responses = responses;
    if (body) op.requestBody = { required: true, content: { 'application/json': { schema: body } } };
  };
  set('/v1/sessoes', 'post', { 201: member, 400: error('dados_invalidos'), 401: error('credenciais_invalidas'), 429: error('tentativas_demais (details.segundos_restantes)') }, {
    type: 'object',
    required: ['email', 'senha'],
    properties: { email: { type: 'string' }, senha: { type: 'string' } },
  });
  set('/v1/sessoes/atual', 'delete', { 204: { description: 'Sessão apagada; Set-Cookie expira o cookie' }, 401: error('sessao_invalida') });
  set('/v1/eu', 'get', { 200: member, 401: error('sessao_invalida') });
  set('/v1/eu/senha', 'put', { 204: { description: 'Senha trocada' }, 400: error('dados_invalidos'), 401: error('sessao_invalida'), 422: error('senha_atual_incorreta ou senha_fraca (details.regras_faltando)') }, {
    type: 'object',
    required: ['senha_atual', 'nova_senha'],
    properties: { senha_atual: { type: 'string' }, nova_senha: { type: 'string' } },
  });
  return document;
}
