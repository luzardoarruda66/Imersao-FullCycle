---
paths:
  - "apps/chat-api/**"
---

# NestJS 12 na API do chat

Regras de framework tiradas da documentação do NestJS 12 (docs.nestjs.com, via Context7), complementando o `apps/chat-api/AGENTS.md`, que já cobre ESM, Vitest, Standard Schema e os pacotes oficiais. As decisões do produto ficam no `docs/lld.md`; aqui fica só como o Nest as implementa. Um item que o LLD marca "a definir" continua aberto: a regra diz como o Nest faz, não escolhe por ele.

## Validação

- A app usa `StandardSchemaValidationPipe` ou `ValidationPipe`, um dos dois, registrado uma vez como `APP_PIPE` ou `useGlobalPipes()`.
- O schema vai no decorador: `@Body({ schema })`, `@Param('id', { schema })`, `@MessageBody({ schema })`. O tipo do parâmetro sai do schema (`z.infer` ou equivalente).
- A biblioteca de schema está "a definir" no LLD (seção 1). Confirme a escolha antes de instalar uma.

## Erros

- O corpo de erro é o do LLD, seção 3, "Erros". No Nest, um corpo único para toda exceção, inclusive as do próprio framework (404 de rota, JSON malformado), sai de um filtro global `@Catch()` sem argumento.
- O filtro pega o adaptador HTTP de `HttpAdapterHost` dentro de `catch()`, não no construtor, e responde com `httpAdapter.reply()`.
- Lance `HttpException` e subclasses no HTTP e `WsException` no gateway.

## WebSocket (Socket.IO)

- Pacotes: `@nestjs/websockets` e `@nestjs/platform-socket.io` ([ADR 0019](../../docs/adr/0019-socket-io-tempo-real.md)).
- O Nest não roda guards em `handleConnection()`. Autentique o handshake ali (com `@nestjs/authentication`, `WsAuthenticator.authenticateConnection()`). O guard roda de novo em cada mensagem, então uma sessão revogada para no meio da conexão.
- Só `WsException` chega ao cliente com a própria mensagem: qualquer outra exceção vira `'Internal server error'` no evento `exception`. Nos pipes do gateway, passe `exceptionFactory: (issues) => new WsException(issues)`.
- Com `namespace` no `@WebSocketGateway()`, o `@WebSocketServer()` injeta um `Namespace`, não um `Server`.

## Sessão, senha e limite de tentativas

- `@nestjs/authentication` cobre o cookie de sessão (`SessionCookieProvider`, `SignInService`), o guard global com `@Public()` e o handshake do WebSocket. Avalie esse pacote antes de escrever a autenticação na mão ([ADR 0016](../../docs/adr/0016-sessao-na-api-do-chat.md)).
- O hash de senha é o scrypt do `PasswordHasher` do pacote ([ADR 0023](../../docs/adr/0023-scrypt-hash-de-senha.md)); não escreva um provider de hash próprio.
- O `verify()` de senha recebe `undefined` quando a conta não existe e confere um hash falso, para que o tempo de resposta não revele quais e-mails existem.
- O limite de erros seguidos no login é um contador próprio no Banco do chat, e não o `@nestjs/throttler`, que conta requisições e não zera no acerto. O throttler fica só com o teto por IP, com `@Throttle()` na rota de entrar. A chave, a regra e os números estão no LLD, seções "Segurança", "Sessão e login" e "Valores e configuração".
- Nos testes, sobrescreva o hasher com um custo baixo (`overrideProvider(PasswordHasher)`), senão a suíte fica lenta.

## Configuração

- `ConfigModule.forRoot({ validate })` valida tudo na subida: uma variável que falta derruba o processo, como pede o LLD (seção 3, "Configuração").
- Agrupe por área com `registerAs('database', () => ({ ... }))`. Essas fábricas são o único lugar que lê `process.env`; o resto injeta a configuração já tipada.
- No Nest 12, as opções da biblioteca de validação ficam em `validationOptions.libraryOptions`.

## TypeORM

- Monte o `TypeOrmModule.forRootAsync({ inject: [ConfigService], useFactory })` a partir da configuração validada.
- Mantenha `synchronize: false`: o schema é das migrações em `apps/chat-api/migrations/` ([ADR 0018](../../docs/adr/0018-typeorm-api-do-chat.md)).
- Um arquivo de data source exporta as opções usadas pelo `TypeOrmModule` e, como `default`, o `DataSource` que a CLI do TypeORM usa no `migration:generate`. A migração gerada é revisada à mão antes do commit.
- Com `autoLoadEntities: true`, uma entidade que só aparece numa relação, sem `forFeature()`, fica de fora.
- O que o LLD exige atômico (seção 3, "Transações") roda em `dataSource.transaction(async (manager) => { ... })`, com todas as escritas pelo `manager` recebido.

## OpenAPI (snapshot do contrato)

- `SwaggerModule.createDocument(app, config)` gera o documento sem publicar a UI. Grave-o em `apps/chat-api/openapi.json` para o snapshot do LLD.
- Chame `createDocument()` depois de `app.enableVersioning()` e de `setGlobalPrefix()`, senão os `paths` saem sem o prefixo.
- Schemas Standard Schema em `@Body({ schema })` já aparecem no documento como corpo da requisição.

## Testes

- Unitário: `Test.createTestingModule({ ... }).compile()` com `await`; `useMocker((token) => ...)` cria os mocks das dependências que faltam com `vi.fn()`.
- E2E: `moduleRef.createNestApplication()`, `await app.init()` e Supertest em `app.getHttpServer()`; feche com `app.close()` no `afterAll`. Para escutar de verdade (o handshake do WebSocket, por exemplo), use `app.listen(0, '127.0.0.1')`.
