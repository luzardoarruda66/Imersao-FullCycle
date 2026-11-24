# LLD — Full Cycle Chat

2026-11-24 · Luiz Carlos · Status: rascunho · HLD: [hld.md](hld.md)

**Onde mora cada fato**

| Fato | Dono |
| --- | --- |
| Arquitetura, contêineres, integrações e motivos | [HLD](hld.md) |
| Decisões com porquê | `docs/adr/`, com o índice na seção "Decisões" deste documento e do HLD |
| Escopo e público | [Product brief](product-brief.md) |
| Vocabulário | [GLOSSARY.md](../GLOSSARY.md), na raiz |
| Linguagem visual (cores, componentes, microtexto) | [Figma](https://www.figma.com/design/GXeHfkmxrSH9mGMHTweQSP/slack--Copy-) |
| Contrato REST da API do chat | `apps/chat-api/openapi.json`, gerado pelo `@nestjs/swagger` (`pnpm openapi`); o teste E2E falha quando ele fica velho |
| Contrato REST do Serviço de agentes | `apps/agents/openapi.json`, gerado pelo FastAPI (planejado) |
| Catálogo de códigos de erro | Os snapshots OpenAPI, como enum na resposta de erro de cada rota (`apps/chat-api`: existe; os outros projetos, planejado) |
| Eventos do WebSocket | Schemas Zod e tipos em `packages/chat-events/` (`diagnostico`, `mensagem_criada`, `conversa_visivel`, `pronto` e `perdido` existem; `contagem_atualizada` e `digitando`, planejados na F1-04; os outros, com as funcionalidades que os emitem) |
| Schema do Banco do chat | `apps/chat-api/migrations/`, migrações do TypeORM |
| Schema do Banco dos agentes | A definir |
| Schema do Banco de negócio | Script de carga em `apps/agents/scripts/` (planejado) |
| Schema das variáveis de ambiente | `apps/chat-api/src/config/env.ts` e `apps/web/src/server/config.ts` (Zod), com `apps/chat-api/.env.example`; os outros projetos, a definir |
| Práticas e comandos | `apps/*/AGENTS.md`, um por app (`web` e `chat-api` existem; `agents` planejado), apontados pelo `AGENTS.md` da raiz (planejado); as regras de framework ficam em `.claude/rules/`, apontadas por esses arquivos |

Os snapshots OpenAPI ficam gravados no repositório, e a CI falha quando o código muda o contrato
sem atualizar o snapshot.

## 1. Estrutura do código

Um repositório com três aplicações implantadas separadamente (HLD, seção 5) e um pacote de tipos
compartilhado. `web`, `chat-api` e `chat-events` são projetos pnpm independentes, cada um com o
seu lockfile, sem workspace ([ADR 0017](adr/0017-projetos-pnpm-independentes.md)); `chat-events`
entra em `web` e em `chat-api` como dependência `file:../../packages/chat-events`, e uma mudança
nele exige reinstalar nos dois projetos. O projeto `agents` é gerenciado pelo uv.

```
apps/
  web/            Frontend/BFF (Next.js)                              existe
  chat-api/       API do chat (NestJS): REST, WebSocket e o comando   existe
                  de contas e permissões (HLD, seção 2)
    migrations/   migrações do Banco do chat                          existe
  agents/         Serviço de agentes e Worker (Python + ADK),         planejada
                  dois processos do mesmo projeto
    scripts/      script de carga do Banco de negócio                 planejada
packages/
  chat-events/    schemas e tipos dos eventos do WebSocket, usados    existe
                  por chat-api e web
docs/             HLD, LLD, ADRs, brief
```

| Papel | Escolha | Por quê |
| --- | --- | --- |
| Frontend/BFF | Next.js com App Router | Next.js: HLD, seção 5 ([ADR 0002](adr/0002-next-bff-websocket-direto.md)); App Router: a definir |
| Leituras no cliente que o tempo real altera | SWR | A definir |
| Tempo real, no servidor e no cliente | Socket.IO | [ADR 0019](adr/0019-socket-io-tempo-real.md) |
| Cliente do Redis na API do chat | `ioredis` | Tem os Streams, que guardam os eventos por pessoa, e reconecta sozinho |
| API do chat | NestJS | HLD, seção 5 |
| ORM e migrações do Banco do chat | TypeORM | [ADR 0018](adr/0018-typeorm-api-do-chat.md) |
| Snapshot do contrato da API do chat | `@nestjs/swagger` | Gera o OpenAPI a partir do código |
| Sessão, cookie e guard de autenticação da API do chat | `@nestjs/authentication` | Cobre o cookie de sessão, o guard global com `@Public()` e o handshake do WebSocket sobre a sessão no Banco do chat ([ADR 0016](adr/0016-sessao-na-api-do-chat.md)), sem escrever a autenticação à mão |
| Hash de senha | scrypt, pelo `PasswordHasher` do `@nestjs/authentication` | [ADR 0023](adr/0023-scrypt-hash-de-senha.md) |
| Teto de requisições por IP | `@nestjs/throttler`, em memória | Pacote oficial do Nest; o teto por IP não precisa do Redis |
| Gerenciador dos projetos TypeScript | pnpm, um projeto por pasta, sem workspace | [ADR 0017](adr/0017-projetos-pnpm-independentes.md) |
| Agentes | Python + Google ADK | [ADR 0003](adr/0003-agentes-python-google-adk.md) |
| HTTP do Serviço de agentes | FastAPI próprio, com as rotas chamando o `Runner` do ADK | A definir |
| Gerenciador do projeto Python | uv | A definir |
| Fila de pedidos demorados | A definir | — |
| Acesso ao modelo, trocável por configuração (HLD, seção 2) | A definir | — |
| Geração do PDF | A definir | — |
| Acesso ao Banco dos agentes e migrações | A definir | — |
| Validação de entrada e das variáveis de ambiente, nos projetos TypeScript | Zod | Standard Schema: o mesmo tipo de schema no pipe do Nest, no `ConfigModule` e nas Server Actions do `web` |
| Validação das variáveis de ambiente, no projeto Python | A definir | — |
| Parser da conferência de somente leitura | A definir | — |
| Log estruturado | A definir | — |
| Testes de navegador | Playwright | A imagem oficial roda num contêiner próprio, sem instalar navegador nas imagens das apps (seção "Ambiente de desenvolvimento") |
| Testes unitários e de componente do `web` | Vitest, React Testing Library e jsdom | Recomendação do guia de testes do Next 16.4, e o mesmo runner da API do chat. O Vitest não renderiza Server Components `async`; esses e os fluxos entre telas ficam com o Playwright |

## 2. Componentes e dependências

Os tipos de peça de cada aplicação, o que cada tipo pode chamar e o diagrama das dependências
permitidas estão a definir, assim como os módulos de domínio da API do chat, do projeto `agents`
e do projeto `web`. O que já vale vem do HLD: o BFF dispara o agente
([ADR 0009](adr/0009-bff-dispara-agente.md)), o agente grava pela API do chat como bot
([ADR 0010](adr/0010-agente-grava-como-bot.md)) e o Worker nunca chama o modelo (HLD, seção 5).

### Integrações externas

Situação de todas: `planejada`.

**Armazenamento de objetos (S3)** — usado pelo Worker (gravar) e pela API do chat (URL).

| Operação | Recebe | Devolve | Garante |
| --- | --- | --- | --- |
| Gravar PDF | Chave e arquivo | Nada | Regravar a mesma chave substitui o arquivo; uma nova tentativa do Worker não duplica |
| Gerar URL de download | Chave e validade | URL assinada | Vencida a validade (`validade da URL do PDF`), a URL recusa |

**Fila de pedidos demorados** — o Serviço de agentes enfileira e o Worker consome.

| Operação | Recebe | Devolve | Garante |
| --- | --- | --- | --- |
| Enfileirar | Identificador de pedido e consulta já conferida | Nada | Enfileirar duas vezes o mesmo identificador gera uma tarefa só |
| Consumir | — | Uma tarefa ao Worker | Se o Worker falha, a tarefa volta à fila até `tentativas do Worker` |

**Eventos por pessoa (Redis)** — usado pela API do chat para a reconexão (HLD 6.2). Situação: `existe`.

| Operação | Recebe | Devolve | Garante |
| --- | --- | --- | --- |
| Guardar evento | Pessoa e evento | Identificador crescente por pessoa | A ordem dos identificadores é a ordem dos eventos daquela pessoa |
| Ler desde | Pessoa e último identificador confirmado | Os eventos seguintes, ou "perdido" | "Perdido" quando o identificador já saiu da `retenção dos eventos de reconexão`, ou quando o armazenamento foi perdido; o cliente então recarrega pelo histórico |

- **Identificador.** `época`, instante e sequência, com o instante tirado do `Clock` da API, para o
  teste controlar a retenção. Os eventos de uma pessoa ficam num Redis Stream só dela.
- **Retenção.** Cada gravação apara os eventos mais velhos que a `retenção dos eventos de
  reconexão`, e a chave da pessoa expira depois do mesmo prazo sem gravação.
- **Perdido** é a resposta quando o identificador traz outra época, quando o instante dele é mais
  velho que a retenção em relação ao agora, e quando a leitura falha.
- **Época.** Um valor aleatório guardado no próprio Redis e lido a cada conexão. Se o Redis perdeu
  os dados, ele não existe mais e nasce outro, o que invalida todo identificador antigo. Quando
  uma gravação no Redis falha, a época é trocada assim que o Redis voltar a responder: o evento
  que não foi guardado nunca vira um buraco silencioso.
- **Primeira conexão da aba** (sem último evento): não há reposição; o servidor devolve `pronto`
  com o identificador atual da pessoa, ponto de partida da aba. O identificador nunca é
  anterior ao instante da conexão (sem eventos recentes, é `época-instante-0`), para que a
  retenção também valha para a aba que não recebeu nada. Com o Redis fora, `pronto` leva `ultimo_evento` nulo, e
  o cliente guarda a marca `indisponivel`: na reconexão seguinte o servidor, que não a entende,
  responde `perdido`.
- **Reposição.** A conexão entra na sala da pessoa e, até a reposição acabar, também numa sala de reposição, que fica de fora da entrega ao vivo; um registro em memória guarda, por conexão e sem entregar, os eventos ao vivo que
  chegam. Reenvia em ordem o que veio depois do último evento confirmado e então libera os guardados
  com identificador maior que o último reenviado, e depois `pronto`. Nenhum evento sai duas vezes
  nem fora de ordem.
- **Publicação.** Serializada por pessoa: a ordem de saída é a ordem de gravação. Com o Redis fora,
  o evento sai ao vivo sem ser guardado, e a época troca (acima). O handshake e a entrega ao vivo
  não dependem do Redis estar de pé.
- **Mensagens do servidor ao cliente.** `evento` (envelope: identificador, tipo, dados, momento),
  `pronto` e `perdido`. O cliente informa o último evento confirmado no `auth` do handshake
  (`ultimo_evento`).

**Contadores (Redis)** — usados pelo Serviço de agentes (HLD 6.3).

| Operação | Recebe | Devolve | Garante |
| --- | --- | --- | --- |
| Conferir e contar pedido | Pessoa | Permitido ou negado | Nega acima do `limite de pedidos por pessoa` |
| Somar custo | Pedido e custo | Se o teto foi atingido | Compara com o `teto de custo por pedido` |

Com o Redis fora, as operações de contadores falham e o pedido é recusado (HLD, seção 8, "Erros,
novas tentativas e idempotência").

## 3. Conceitos transversais de implementação

### Segurança

- **Cookie de sessão:** nome `sid`, `HttpOnly`, `Secure` e `SameSite=Lax`. O `Domain` vem da
  configuração: o domínio pai em produção, para valer nos subdomínios (HLD 6.1), e vazio no
  ambiente local, onde o cookie de `localhost` vale para o `web` e para a `chat-api`, porque cookie
  não depende de porta. O prefixo `__Host-` fica de fora porque proíbe o `Domain`.
- **CSRF:** as mutações do navegador são Server Actions, que comparam `Origin` com `Host`
  ([ADR 0024](adr/0024-server-actions-nas-mutacoes.md)); somado ao `SameSite=Lax`, é a defesa. A
  API do chat ignora o cookie numa escrita vinda de outra origem, mas a chamada do BFF chega sem
  `Origin` e passa por essa conferência: por isso a defesa fica no BFF.
- **Identificador de sessão:** um token aleatório no cookie; o Banco do chat guarda só o SHA-256
  dele, no formato do `@nestjs/authentication`. Quem lê o banco não consegue montar um cookie
  válido.
- **Senha:** guardada com o scrypt do `PasswordHasher` ([ADR 0023](adr/0023-scrypt-hash-de-senha.md)).
  Com e-mail inexistente, a conferência roda contra um hash falso, para o tempo de resposta não
  revelar quem tem conta.
- **Limite de tentativas de login:** a chave é o e-mail normalizado mais o IP. O contador de erros
  seguidos fica numa tabela própria, e não na linha da pessoa, porque e-mail inexistente também
  conta: sem isso, a falta de espera revelaria quem não tem conta. A regra está em "Sessão e
  login"; os números, em "Valores e configuração". Além dele, o `@nestjs/throttler` põe um teto
  por IP na rota de entrar (`teto de tentativas de entrar por IP`), contra quem testa muitos
  e-mails de um IP só.
- **Origem do IP:** o BFF manda o IP do navegador em `X-Forwarded-For`, e a API do chat confia
  nesse cabeçalho só quando a chamada vem da rede interna (`trust proxy` restrito). Como o BFF
  obtém o IP atrás do proxy da PaaS está a definir, porque depende da PaaS escolhida (HLD,
  seção 12).
- **Participação em canal privado e conversa direta:** um serviço só, no módulo de conversas, a
  confere, e toda rota que lê ou escreve numa conversa o chama. O WebSocket entrega por pessoa e
  não o usa: quem publica o evento o chama para escolher os destinatários. No módulo de conversas, quem faz isso é o
  `ConversationEvents`: o canal público alcança todos os membros, e o canal privado e a conversa direta, só os
  participantes. Quem não participa recebe a mesma resposta de uma conversa que não existe, para que a
  resposta não revele que o canal privado existe. Canal público não exige convite.
- **Credenciais de bot e de serviço:** a forma (um segredo por processo ou por agente) está a
  definir. Toda ação de bot leva o identificador de pedido
  ([ADR 0011](adr/0011-identificador-de-pedido.md)).
- **Dados de negócio no tempo real:** uma mensagem marcada "dados de negócio" é emitida pelo
  WebSocket pessoa a pessoa. Quem tem permissão de dados recebe o evento com o conteúdo; os outros
  membros recebem o evento com a versão bloqueada. O evento guardado nos eventos de reconexão
  segue a mesma regra, por pessoa. Mensagens sem a marca saem num evento só para a conversa
  ([ADR 0020](adr/0020-dados-de-negocio-pessoa-a-pessoa.md); depende de mudança no HLD). Se uma
  função única monta a mensagem para cada destinatário (histórico, REST, evento e notificação)
  está a definir.

### Concorrência e idempotência

- **Envio de mensagem:** unicidade em (autor, identificador gerado no cliente). A inserção tolera
  o conflito: se o identificador já existe, a API devolve a mensagem já gravada, com o mesmo
  status de sucesso, e não gera de novo menções, notificações, contadores nem eventos.
- **Ação de bot:** unicidade em (identificador de pedido, tipo de ação). Tipos: resposta, pergunta
  ao usuário, aviso de início, entrega do PDF, criação de tarefa. A repetição devolve o que já foi
  gravado, sem nova mensagem, tarefa ou notificação.
- **Contadores de não lidas e de menções:** um registro por pessoa e conversa, somado de forma
  atômica na transação da mensagem (incremento no próprio `UPDATE`, sem ler antes) e zerado quando
  a pessoa lê ([ADR 0021](adr/0021-contadores-gravados.md)). A linha da pessoa na conversa nasce
  na primeira mensagem de outra pessoa depois que ela passou a participar (no canal público,
  participar é existir como membro do workspace), e nada é preenchido para trás: mensagem
  anterior à linha nunca vira não lida. O autor da mensagem não soma contador para si.
- **Última leitura:** só avança. A atualização é condicional: grava só se a nova posição for
  posterior à gravada; uma posição igual ou anterior, vinda de uma aba atrasada, não muda nada,
  não altera os contadores e não publica evento.
- **Contadores na leitura.** Quando a posição avança, a mesma transação recalcula `nao_lidas`
  como o número de mensagens de outras pessoas depois da posição (zero quando ela é a última
  mensagem) e `mencoes` como o número de menções à pessoa depois dela (sempre zero até a F1-05). O
  `UPDATE` trava a linha, então a mensagem que está sendo gravada espera e entra na conta.
  Uma leitura nunca deixa um contador negativo.

### Transações

O que precisa ser atômico é do HLD (seção 7, "Regras que pesam no desenho"): a mensagem com as
menções, as notificações e os contadores; a tarefa com a notificação dela. O evento só sai depois
do commit, por publicação direta, sem tabela de saída
([ADR 0025](adr/0025-publicacao-direta-depois-do-commit.md)): o código que grava devolve o controle
só depois da transação confirmada e então chama a publicação, que nunca roda dentro da transação.
Onde a transação começa e como passa de um módulo a outro estão a definir.

### Erros

- Corpo de erro nas três APIs (BFF, API do chat, Serviço de agentes):
  `{ "error": { "code": "...", "message": "...", "details": ... } }`. O `code` é estável; o
  `message` é para pessoas.
- O catálogo de códigos fica nos snapshots OpenAPI, como enum na resposta de erro de cada rota.
- Os códigos são em português, em `snake_case` (`credenciais_invalidas`).
- Na API do chat, um filtro global `@Catch()` traduz toda exceção, inclusive as do próprio
  framework, nesse corpo. No Serviço de agentes, quem traduz está a definir.
- **Mensagem gravada, mas o Serviço de agentes não recebeu o pedido** (HLD 6.3): o BFF responde
  sucesso, com a mensagem gravada e um campo que diz que o agente não recebeu o pedido. A tela
  mostra a mensagem enviada e um aviso de erro do agente ao lado.

### Logs

A regra do HLD vale para todos os projetos: logs estruturados, sem conteúdo de mensagens e sem
resultado de consultas (HLD, seção 8, "Observabilidade"). A biblioteca, os campos de correlação e
a lista completa do que nunca vai para o log estão a definir.

| Nível | Quando |
| --- | --- |
| info | Fim de cada requisição e de cada pedido a agente, com tempo de resposta e custo como campos |
| warn | Resposta barrada pelo lastro; limite de pedidos ou teto de custo atingido; tentativa de login bloqueada |
| error | Falha do modelo; tentativas do Worker esgotadas; exceção inesperada |

### Configuração

- Cada projeto tem um módulo de configuração só, que lê e valida as variáveis uma vez na subida.
  Nenhum outro arquivo lê `process.env` ou `os.environ`; as peças recebem a configuração já
  tipada.
- Faltou uma variável obrigatória: o processo falha na subida, com o nome da variável na
  mensagem, e nunca no primeiro uso. Assim, a conferência de saúde da PaaS barra a versão nova e
  mantém a anterior (HLD, seção 9).
- Cada projeto tem um `.env.example` gravado no repositório, com todas as variáveis e valores
  falsos; o `.env` real fica no `.gitignore`.
- A validação usa o Zod nos projetos TypeScript (no `ConfigModule.forRoot({ validate })` da API
  do chat e no módulo `server-only` de configuração do `web`); no projeto Python está a definir. A
  lista das variáveis fica em "Valores e configuração".

## 4. Dados

**Convenções** (tabelas nossas do Banco do chat e do Banco dos agentes; as tabelas de sessão do
ADK seguem o ADK):

- Nomes em `snake_case`, tabelas no plural (`messages`, `channel_members`); o TypeORM usa uma
  estratégia de nomes que converte os nomes do código.
- Id em UUID v7, gerado na aplicação ([ADR 0022](adr/0022-uuid-v7.md)).
- Datas em `timestamptz`, sempre em UTC, com `created_at` e `updated_at` em toda tabela. A
  conversão para o fuso de quem pediu acontece só na borda: na tela e no recorte "hoje" do agente.
- Exclusão física. A exceção é a mensagem: apagar zera o conteúdo e grava `deleted_at`, e a linha
  fica para mostrar "mensagem apagada" (HLD, seção 7).

O diagrama de entidades e relações está a definir. As unicidades e os contadores que as regras já
exigem estão em "Conceitos transversais de implementação", seção "Concorrência e idempotência".

| Banco | Entidade (HLD, seção 7) | Situação |
| --- | --- | --- |
| Chat | Pessoas (perfil, papel de administrador, permissão de dados). E-mail gravado sem espaços nas pontas e em minúsculas, com índice único. @usuário (`username`) obrigatório e único, gravado em minúsculas; cargo, telefone e status opcionais, lidos pela F1-03 e escritos pela F1-07. A busca ignora acentos e maiúsculas com a extensão `unaccent` do Postgres, que a migração cria. As contas que já existiam receberam o @usuário na migração, derivado da parte do e-mail antes do `@`, com sufixo numérico em colisão | existe |
| Chat | Sessões, no formato do `SessionStore` do `@nestjs/authentication` | existe |
| Chat | Tentativas de entrar (e-mail normalizado e IP, erros seguidos, fim da espera), do limite de tentativas (HLD 6.1) | existe |
| Chat | Conversas, numa tabela só com o tipo (canal público, canal privado ou direta), e participantes (só no canal privado e na conversa direta: o canal público não os grava). Nome do canal único sem diferenciar maiúsculas, valendo entre público e privado; um par de membros só tem uma conversa direta, pela chave `menorId:maiorId` | existe |
| Chat | Mensagens (texto, autor pessoa, conversa) | existe |
| Chat | Mensagens: autor bot, citação e marca "dados de negócio" | a detalhar |
| Chat | Menções | a detalhar |
| Chat | Estado de leitura, por pessoa e conversa: posição de leitura (a última mensagem lida), contador de não lidas e contador de menções, nunca negativos. Regras em "Concorrência e idempotência" | planejada |
| Chat | Notificações | a detalhar |
| Chat | Tarefas | a detalhar |
| Chat | Pedidos aos agentes e ações de bot | a detalhar |
| Chat | Perguntas pendentes | a detalhar |
| Chat | Referência ao PDF de uma mensagem | a detalhar |
| Agentes | Registro de agentes conectados | a detalhar |
| Agentes | Sessões do ADK | criadas pelo ADK |
| Negócio | Dados de vendas | dono: script de carga |

## 5. Interfaces

**Convenções**

- Prefixo `/v1` na API do chat e no Serviço de agentes; `/api`, sem versão, no BFF, porque o
  Frontend e o BFF são implantados juntos. Uma mudança que quebra entre serviços sai como nova
  versão do prefixo, em duas implantações.
- Navegador e BFF: a página lê pelos Server Components; as mutações são Server Actions
  ([ADR 0024](adr/0024-server-actions-nas-mutacoes.md)).
- Autenticação: o navegador fala com o BFF por cookie de sessão. O BFF repassa o cookie `sid`
  recebido, no cabeçalho `Cookie` de cada chamada à API do chat, e manda o IP do navegador em
  `X-Forwarded-For`; ao entrar e ao sair, devolve ao navegador o `Set-Cookie` da API. O BFF
  chama o Serviço de agentes com a credencial de serviço; os bots chamam a API do chat com a
  credencial de bot e o identificador de pedido (forma em "Segurança").
- Campos do JSON em `snake_case`, nas três APIs.
- Paginação do histórico: por âncora, e não por deslocamento, para mensagem nova não deslocar a
  página. `antes` recebe o id de uma mensagem da própria conversa; a resposta traz as mensagens em
  ordem cronológica e `tem_mais`. Sem `antes`, devolve as mais recentes. Âncora que não é UUID ou
  que não é da conversa: `dados_invalidos` (400). O tamanho é o `tamanho da página do histórico`.
  A paginação das outras listas continua a definir.
- Erros: "Conceitos transversais de implementação", seção "Erros".
- Eventos do WebSocket: schemas Zod e tipos em `packages/chat-events/`, consumidos por `chat-api` e
  `web`. O WebSocket é Socket.IO só com o transporte WebSocket; o handshake usa o cookie `sid` e
  confere a origem contra `WEB_ORIGIN`. A recusa usa `sessao_invalida` ou `origem_invalida`.
- Eventos da F1-04 (situação `planejada`), todos publicados depois do commit (ADR 0025), um por
  pessoa: `mensagem_criada`, para cada participante, o autor inclusive, com a conversa, a
  mensagem e as contagens da pessoa naquela conversa; `contagem_atualizada`, só para quem leu,
  com as contagens novas; `digitando`, com a conversa e quem digita, para os outros
  participantes. O `digitando` é só ao vivo: não entra nos eventos de reconexão do Redis, porque
  repor um "digitando" velho seria mentira, e a publicação ganha uma variante sem guarda.
- Mensagem do cliente ao servidor, `digitando`, com a conversa, validada pelo schema do pacote. O
  gateway só a repassa a quem se registrou por tipo; o módulo de conversas confere a participação
  (sem ela, ignora sem resposta), descarta a repetida da mesma pessoa e conversa em menos do
  `intervalo mínimo entre "digitando"`, não repassa em conversa com mais membros que o
  `limite de membros para o "digitando"` (no canal público, todos os membros do workspace) e
  nunca o repassa a quem digita.

**Índice das rotas**

O índice por domínio (BFF; API do chat, para o BFF e para os bots; Serviço de agentes) e a lista
de eventos do WebSocket estão a definir. O que já está decidido:

| Método e caminho | Situação | Comportamento |
| --- | --- | --- |
| Envio de mensagem no BFF (caminho a definir) | a detalhar | Mensagem gravada e agente sem receber o pedido: "Conceitos transversais de implementação", seção "Erros" |
| `POST /v1/sessoes` (API do chat) | existe | Entrar: "Sessão e login". Erros: `credenciais_invalidas` (401), `tentativas_demais` (429, com `details.segundos_restantes`), `dados_invalidos` (400) |
| `DELETE /v1/sessoes/atual` (API do chat) | existe | Sair: apaga a sessão do cookie e devolve o `Set-Cookie` que o expira |
| `GET /v1/eu` (API do chat) | existe | O membro da sessão. Sem sessão válida: `sessao_invalida` (401), código de toda rota com sessão |
| `PUT /v1/eu/senha` (API do chat) | existe | Trocar a senha: "Sessão e login". Erros: `senha_atual_incorreta` (422), `senha_fraca` (422, com `details.regras_faltando`) |
| `GET /v1/conversas` (API do chat) | existe | As conversas do membro, separadas por tipo (`canais_publicos`, `canais_privados`, `diretas`), em ordem alfabética sem diferenciar maiúsculas; na conversa direta, o nome é o da outra pessoa |
| `POST /v1/conversas/canais` (API do chat) | existe | Cria canal (nome aparado, de 1 a `tamanho do nome do canal`; `tipo` `publico` ou `privado`). O canal privado começa com o criador como participante. Erros: `nome_canal_em_uso` (409), `dados_invalidos` (400) |
| `POST /v1/conversas/diretas` (API do chat) | existe | Abre a conversa direta com um membro ou devolve a que já existe (200 nos dois casos). Erros: `conversa_direta_consigo_mesmo` (422), `nao_encontrado` (404) |
| `GET /v1/conversas/:id` (API do chat) | existe | A conversa; o canal privado traz `participantes`. Id que não é UUID, que não existe, ou de canal privado ou conversa direta de que a pessoa não participa: `conversa_inexistente` (404), igual nos três casos ("Segurança") |
| `POST /v1/conversas/:id/participantes` (API do chat) | existe | Convida membros (`membros_ids`) para canal privado; quem já participa fica como está. Erros: `conversa_nao_aceita_convite` (422, canal público e conversa direta), `dados_invalidos` (400, inclusive membro que não existe), `conversa_inexistente` (404) |
| `GET` e `POST /v1/conversas/:id/mensagens` (API do chat) | existe | Lê as `mensagens devolvidas por leitura` mais recentes, em ordem cronológica; envia (texto aparado, até `tamanho da mensagem`). Erros: `conversa_inexistente` (404), `dados_invalidos` (400) |
| `GET /v1/membros` (API do chat) | existe | Os membros do workspace, só `id` e `nome` (o perfil é da F1-03) |
| Evento `mensagem_criada` (WebSocket) | existe | Publicado depois do commit da mensagem, para quem vê a conversa ("Segurança"); leva o id da conversa e a mensagem completa |
| Evento `conversa_visivel` (WebSocket) | existe | Publicado quando a pessoa passa a ver uma conversa: canal público novo (todos os membros), canal privado novo (o criador), conversa direta nova (os dois) e convite (só quem foi convidado de fato). Leva só o id da conversa; o `web` relê a lateral |
| `GET /v1/pessoas` (API do chat) | existe | Busca de pessoas, com sessão. A busca (`busca`) casa com parte do nome ou do @usuário, sem diferenciar maiúsculas e acentos; um `@` inicial é ignorado. Não devolve quem busca. Ordena por nome e devolve no máximo `resultados da busca de pessoas`. Com a busca vazia, devolve os primeiros membros nessa ordem. Cada item traz id, nome e @usuário |
| `GET /v1/pessoas/:id` (API do chat) | existe | Perfil de qualquer membro, com sessão: id, nome, @usuário, cargo, telefone e status. Nunca devolve e-mail, papel de administrador nem permissão de dados. Id que não existe ou que não é um UUID: `pessoa_inexistente` (404) |
| `GET /v1/conversas/:id/mensagens` (API do chat) | planejada | Ganha `antes` e `tem_mais` (convenção de paginação, acima) |
| `POST /v1/conversas/:id/leitura` (API do chat) | planejada | Registra a leitura até uma mensagem da conversa, com sessão e pelo serviço de participação; devolve as contagens da conversa. Regras em "Concorrência e idempotência". Erros: `conversa_inexistente` (404), `dados_invalidos` (400, para mensagem de outra conversa) |
| `GET /v1/conversas` (API do chat) | planejada | Passa a trazer `nao_lidas` e `mencoes` em cada conversa |
| `GET /api/conversas/:id/mensagens` (BFF) | planejada | Repassa a página do histórico para o SWR do navegador |

## 6. Estados e regras

As subseções desta parte (pedido ao agente, pergunta pendente, mensagem, consulta a dados de
negócio, limite de pedidos e teto de custo) e as regras de cada uma estão a definir. As regras já
decididas ficam abaixo.

### 6.1 Tarefa

Dois estados: aberta e concluída (HLD 6.6).

- Só o responsável conclui e reabre a tarefa. Outra pessoa, inclusive quem delegou, recebe um
  erro do catálogo.
- Ao concluir ou reabrir, quem delegou é avisado (HLD 6.6).
- Concluir uma tarefa já concluída, ou reabrir uma aberta: a definir.

### 6.2 Sessão e login

Regras do [PRD da F1-01](f1-01-entrar/prd.md).
Os números estão em "Valores e configuração".

- **Entrar.** E-mail sem diferença entre maiúsculas e minúsculas. E-mail inexistente e senha
  errada recebem a mesma resposta, para não revelar quem tem conta.
- **Limite de tentativas.** Conta por e-mail normalizado e IP (chave em "Segurança"), inclusive
  para e-mail inexistente. Depois de `tentativas de login e janela` erradas seguidas, a entrada
  fica recusada durante a espera, inclusive com a senha certa, e a resposta diz quanto tempo falta.
  Um acerto zera o contador. A espera termina sozinha; não há bloqueio permanente da conta.
- **Validade.** A sessão vence depois da `duração da sessão` sem uso; cada requisição ou conexão
  autenticada renova o prazo. Não há teto absoluto: o `absoluteTtl` do pacote fica no máximo.
- **Sair.** Apaga a sessão no Banco do chat (HLD 6.1). As outras sessões da pessoa continuam.
- **Conexão em tempo real.** O handshake autentica pelo cookie e, como toda conexão autenticada,
  renova o prazo. A cada `intervalo de conferência das sessões`, uma consulta só confere as
  sessões de todas as conexões abertas e fecha as que não valem mais (sair, vencimento, encerrar
  sessões, redefinir ou trocar a senha). A conferência não renova a sessão. A consulta periódica
  existe porque o comando `contas` roda em outro processo e não alcança as conexões. As outras
  conexões da mesma pessoa, de outras sessões, continuam abertas.
- **Trocar a senha.** Exige a senha atual; com ela errada, nada muda. A nova senha cumpre a
  `regra da senha`, e a recusa lista as regras que faltaram. Depois da troca, a sessão atual
  continua e as outras sessões da pessoa são apagadas.
- **Operação.** O comando `contas` da API do chat cria a conta (e-mail, @usuário e nome), redefine a
  senha, encerra as sessões, troca o @usuário, dá e tira o papel de administrador e a permissão de dados. Criar e redefinir
  geram uma senha aleatória que cumpre a `regra da senha` e a mostram uma vez só; não há troca
  obrigatória no primeiro acesso. Encerrar as sessões, ou redefinir a senha, apaga todas as
  sessões da pessoa.
  `criar` e `definir-usuario` recusam @usuário em uso ou fora do formato (`formato do @usuário`), com
  mensagem clara. Trocar o @usuário não encerra as sessões da conta; só a operação o troca.

## 7. Processos de segundo plano

| Tarefa | Disparo | O que faz | Na falha | Situação |
| --- | --- | --- | --- | --- |
| Relatório em PDF (Worker) | Pedido na fila (HLD 6.5) | HLD 6.5 | Nova tentativa até `tentativas do Worker`; esgotadas, grava "não consegui" (HLD 6.5) | a detalhar |

Sessões vencidas não têm rotina: cada sessão nova apaga as vencidas, e uma tentativa de entrar
vencida é sobrescrita na próxima tentativa com a mesma chave. A idempotência da tarefa (chave no
S3 e entrega única) e outras rotinas (retenção dos PDFs, perguntas pendentes vencidas) estão a
definir.

## 8. Cliente

**Telas**

| Rota | Acesso | Lê | Ações | Situação |
| --- | --- | --- | --- | --- |
| `/entrar` | Público | — | Entrar com e-mail e senha | existe |
| `/` (casca: Rail, lateral com as conversas e menu do usuário) | Sessão | O membro da sessão e a lista de conversas | Abrir conversa; criar canal; abrir conversa direta; trocar a própria senha, num diálogo; sair | existe |
| `/conversas/[id]` | Sessão | A conversa e as `mensagens devolvidas por leitura` mais recentes | Enviar mensagem; ver os participantes e convidar, no canal privado | existe |
| A definir | Sessão | Histórico da conversa | Editar, apagar, citar; "digitando"; botões de resposta pronta | a detalhar |
| A definir (lateral) | Sessão | Contadores de não lidas e de menções, na lateral (selo de `99+` acima de 99; sem selo em zero; menções zeradas até a F1-05) | — | planejada |
| A definir | Sessão | Atividade: Menções, DMs, Tarefas | Abrir a mensagem; concluir e reabrir tarefa | a detalhar |
| `/pessoas/[id]` | Sessão | Perfil de qualquer membro, pelo id e não pelo @usuário, para o link não quebrar se a operação trocar o @usuário | Abrir conversa direta, menos no próprio Perfil. Editar o próprio perfil e a presença são da F1-07 | existe |
| Diálogo na lateral, aberto pela seção "Conversas diretas" | Sessão | Busca de pessoas, por `GET /api/pessoas` no BFF, com SWR | Abrir conversa direta ou o Perfil; substitui o seletor de membros da F1-02 | existe |
| A definir | Sessão; conectar e desconectar só para administrador | Agentes e estado de conexão | Conectar e desconectar agente | a detalhar |

**Leituras e tempo real.** A página carrega pelos Server Components. No cliente, o SWR guarda as
leituras que o tempo real altera (mensagens, não lidas, notificações), e cada evento do WebSocket
atualiza esse cache direto, sem nova requisição. Na F1-02, o painel da conversa aberta guarda as mensagens
em estado do próprio componente, sem SWR: junta a leitura do servidor, a mensagem que a pessoa enviou e o evento
`mensagem_criada` sem repetir (pelo identificador), e o `conversa_visivel` faz o `web` reler a lateral. O SWR
entra quando a F1-04 trouxer as não lidas ("Questões em aberto").

- **Mensagens.** `mensagem_criada` acrescenta ao fim da conversa carregada, ignorando um id já
  presente (a resposta do envio e a reposição podem trazer a mesma), e grava as contagens na lista.
  Para uma conversa não carregada, só a lista muda. Se a rolagem estava no fim, segue no fim; no
  meio, não se move e a tela mostra "Novas mensagens". O histórico anterior carrega por página
  quando a rolagem chega ao começo e também por botão, e para em `tem_mais` falso.
- **Leitura.** Só a aba visível, com a conversa aberta e a rolagem no fim, registra a leitura da
  última mensagem carregada, depois de uma espera curta para juntar mensagens seguidas. A conversa
  nessas condições não mostra selo novo.
- **"Digitando".** O campo manda `digitando` ao digitar, no máximo uma vez a cada `intervalo de envio
  do "digitando"` e só com texto. O aviso, "@usuário está digitando" ou "Há N pessoas digitando...",
  some em `tempo para o "digitando" sumir` sem novo evento ou quando chega a mensagem do autor, e
  nunca mostra a própria pessoa.

**Sessão no cliente.**

- O proxy do Next (`src/proxy.ts`, o antigo middleware) confere só se o cookie de sessão existe;
  sem ele, manda para "Entrar". A validação de verdade é da API do chat.
- Ao mandar para "Entrar", guarda o caminho pedido na URL (`/entrar?para=/caminho`) e volta a ele
  depois de entrar. Só vale um caminho que começa com uma `/` e não com `//` nem `/\`; qualquer
  outro destino vai para a tela principal.
- Qualquer 401 vindo do BFF manda para "Entrar". Com `sessao_invalida`, o BFF também apaga o
  cookie: sem isso, o proxy veria o cookie velho e o navegador ficaria indo e voltando entre a
  tela principal e "Entrar".
- "Entrar" aberta com sessão válida (conferida na API, não no proxy) manda para a tela principal.
- Com a API do chat fora do ar ou respondendo 5xx, a página logada mostra a porta "Erro de
  sessão", com "Tentar de novo", em vez de mandar para "Entrar": uma queda da API não tira
  ninguém da sessão.
- Um 401 no WebSocket fecha a conexão e manda para "Entrar". Na prática, o cliente deixa de
  reconectar e recarrega a página atual: o servidor do `web` revalida a sessão, o BFF apaga o
  cookie e o proxy leva a "Entrar", sem o laço descrito acima.
- **Conexão em tempo real.** Um módulo do cliente, sem tela, na casca da área logada, abre uma
  conexão por aba, com `withCredentials`, em `NEXT_PUBLIC_CHAT_WS_URL`. Guarda o último evento
  confirmado, manda-o a cada reconexão e entrega os eventos por tipo a quem se inscreveu; ignora o
  que já viu. No `perdido`, recarrega a página atual pelo histórico, sem erro técnico na tela. A
  fábrica do socket é injetável, para o teste usar um socket falso. Expõe também o estado da
  conexão, que a casca mostra como "conectado" ou "reconectando" (F1-04, `planejada`), sem
  "reconectando" na primeira conexão da página, anunciado por região `aria-live` educada.

**Notificação do navegador.**

- A permissão do navegador é pedida só quando a pessoa liga a opção (brief, item 6 do escopo).
- A notificação sai do evento do WebSocket, com o chat aberto em alguma aba (HLD, seção 4).
- O clique abre a conversa posicionada na mensagem.

**Reação a erros da API.** 401: "Sessão no cliente". Mensagem gravada com erro do agente:
"Conceitos transversais de implementação", seção "Erros".

## 9. Valores e configuração

**Valores de regra**

| Nome | Valor | Onde vale | Constante ou variável |
| --- | --- | --- | --- |
| Limite de pedidos por pessoa | 10 por minuto (brief, RNF "Custo") | Serviço de agentes | A definir |
| Teto de custo por pedido | A definir | Serviço de agentes | A definir |
| Tentativas do Worker | A definir | Worker | A definir |
| Validade da URL do PDF | A definir | API do chat | A definir |
| Duração da sessão | 30 dias sem uso (PRD da F1-01) | API do chat | Constante `SESSION_DURATION`, em `apps/chat-api/src/config/values.ts` |
| Tentativas de login e janela | 5 erradas seguidas; espera de 15 minutos (PRD da F1-01) | API do chat | Constantes `LOGIN_MAX_FAILURES` e `LOGIN_WAIT_MS`, no mesmo arquivo |
| Teto de tentativas de entrar por IP | 30 em 15 minutos | API do chat | Constantes `LOGIN_IP_CEILING` e `LOGIN_IP_CEILING_WINDOW_MS`, no mesmo arquivo |
| Regra da senha | Mínimo de 8 caracteres, com uma maiúscula, uma minúscula, um número e um símbolo (PRD da F1-01) | API do chat | Função `missingPasswordRules`, em `apps/chat-api/src/accounts/password-rule.ts` |
| Validade do identificador de pedido | A definir | API do chat | A definir |
| Retenção dos eventos de reconexão | 15 minutos (PRD da FD-03) | API do chat (Redis) | Constante `RECONNECT_RETENTION_MS`, em `apps/chat-api/src/config/values.ts` |
| Intervalo de conferência das sessões das conexões | 2 segundos; sustenta o fechamento em até 5 s (PRD da FD-03) | API do chat | Constante `SESSION_CHECK_INTERVAL_MS`, no mesmo arquivo |
| Tempo limite da consulta ao Banco de negócio | A definir | Serviço de agentes e Worker | A definir |
| Tamanho da página do histórico | 50 mensagens, em ordem cronológica; vale também para a leitura sem âncora (as mais recentes) | API do chat | A definir |
| Limite de membros para o "digitando" | 15; acima disso o aviso não é repassado nem mostrado (PRD da F1-04) | API do chat | A definir |
| Tempo para o "digitando" sumir | 5 segundos sem novo evento (spec da F1-04) | `web` | A definir |
| Intervalo de envio do "digitando" | No máximo um a cada 3 segundos por conversa, no campo de mensagem (spec da F1-04) | `web` | A definir |
| Intervalo mínimo entre "digitando" | 1 segundo por pessoa e conversa; o repetido antes disso é ignorado (spec da F1-04) | API do chat | A definir |
| Mensagens devolvidas por leitura, sem paginação | 50 mais recentes, em ordem cronológica (até a F1-04) | API do chat | Constante `MESSAGES_PER_READ`, no mesmo arquivo |
| Tamanho do nome do canal | 1 a 80 caracteres | API do chat e `web` | Constante `CHANNEL_NAME_MAX`, no mesmo arquivo, e a cópia em `apps/web/src/lib/schemas.ts` (projetos independentes, [ADR 0017](adr/0017-projetos-pnpm-independentes.md)) |
| Tamanho da mensagem | Até 4.000 caracteres | API do chat e `web` | Constante `MESSAGE_TEXT_MAX`, no mesmo arquivo, e a cópia em `apps/web/src/lib/schemas.ts` |
| Convidados por pedido | Até 100 | API do chat | Constante `INVITE_MAX`, no mesmo arquivo |
| Formato do @usuário | 3 a 30 caracteres: letras minúsculas, números, `.`, `-` e `_` (PRD da F1-03) | API do chat | Constantes `USERNAME_MIN_LENGTH` e `USERNAME_MAX_LENGTH`, no mesmo arquivo; função `isValidUsername`, em `apps/chat-api/src/accounts/username-rule.ts` |
| Resultados da busca de pessoas | No máximo 20 | API do chat | Constante `PEOPLE_SEARCH_LIMIT`, no mesmo arquivo |

**Variáveis de ambiente**

A lista, o tipo e o padrão de cada variável da API do chat e do `web` estão nos schemas Zod apontados em "Onde mora cada fato". O que cada contêiner recebe está no HLD, seção 8, "Configuração e segredos".

## 10. Ambiente de desenvolvimento

O que substitui cada serviço de produção está no HLD, seção 9, "Implantação e ambientes". O
`compose.yaml` da raiz sobe os serviços; os comandos estão no `AGENTS.md` de cada app.

- **Serviços presentes:** `web`, `chat-api`, Postgres, o substituto do S3 (SeaweedFS) o `e2e` (atrás do `profile` `e2e`) e o Redis, que entra com a FD-03
  para os eventos de reconexão: a `chat-api` exige `REDIS_URL` para subir e só sobe depois de o
  Redis estar saudável. O Serviço de agentes e o Worker entram com o projeto `agents`, que passa a
  usar o mesmo Redis.
- **Contêiner das apps:** a imagem não guarda dependências. O repositório inteiro é montado em
  `/workspace`, e o contêiner, ao subir, roda `pnpm install` e fica de pé sem iniciar a app; o
  servidor de desenvolvimento é iniciado à mão, dentro dele. O `node_modules` fica na pasta do
  host, e só o contêiner instala ou adiciona dependências: rodar o pnpm também no host faz os
  dois lados disputarem a mesma pasta.
- **Testes:** os testes E2E da API do chat usam um banco `chat_test`, que o setup dos testes
  cria e migra. Os testes unitários e de componente do `web` rodam no próprio contêiner `web`,
  sem navegador. Os testes de navegador rodam num serviço `e2e` do Compose, com a imagem oficial
  do Playwright, atrás de um `profile` para não subir por padrão; `scripts/e2e.sh` cria as contas de teste com o comando `contas`, roda a suíte e, num segundo passo, para a `chat-api` para provar a porta "Erro de sessão".
- **Bancos e usuários:** uma instância de Postgres com os três bancos, criados na primeira subida
  por `docker/postgres/init.sql`.

  | Banco | Dono | Acesso de leitura |
  | --- | --- | --- |
  | `chat` | `chat_api` | — |
  | `agents` | `agents` | — |
  | `business` | `postgres` (o script de carga) | `business_readonly`, só `SELECT` ([ADR 0013](adr/0013-somente-leitura-banco-e-codigo.md)) |

- **Armazenamento de objetos:** o SeaweedFS sobe sem bucket e sem credenciais; os dois entram com
  o código do Worker e da URL assinada. O navegador baixa o PDF direto pela URL assinada, e por
  isso ela precisa apontar para um endereço que o navegador alcança, e não para o nome do
  contêiner (pendência em "Questões em aberto").

## 11. Decisões

| ADR | Decisão | Status |
| --- | --- | --- |
| [0017](adr/0017-projetos-pnpm-independentes.md) | Três projetos pnpm independentes, sem workspace | aceita |
| [0018](adr/0018-typeorm-api-do-chat.md) | TypeORM na API do chat | aceita |
| [0019](adr/0019-socket-io-tempo-real.md) | Socket.IO no tempo real | aceita |
| [0020](adr/0020-dados-de-negocio-pessoa-a-pessoa.md) | Mensagem de dados de negócio emitida pessoa a pessoa no WebSocket | aceita |
| [0021](adr/0021-contadores-gravados.md) | Contadores de não lidas e de menções gravados na transação | aceita |
| [0022](adr/0022-uuid-v7.md) | UUID v7 como id, gerado na aplicação | aceita |
| [0023](adr/0023-scrypt-hash-de-senha.md) | scrypt do `@nestjs/authentication` como hash de senha | aceita |
| [0024](adr/0024-server-actions-nas-mutacoes.md) | Mutações do navegador ao BFF por Server Actions | aceita |
| [0025](adr/0025-publicacao-direta-depois-do-commit.md) | Evento publicado direto depois do commit, sem tabela de saída | aceita |

As decisões que mudam o desenho estão no HLD, seção 10.

## 12. Questões em aberto

**Estrutura e bibliotecas**

- [ ] Biblioteca da fila no Redis (arq, Celery ou RQ).
- [ ] Acesso ao modelo: `LiteLlm` do ADK para os três provedores, ou Gemini nativo e `LiteLlm`
      para OpenAI e Anthropic.
- [ ] Biblioteca do PDF (WeasyPrint, ReportLab ou fpdf2).
- [ ] Acesso ao Banco dos agentes e migrações (SQLAlchemy com Alembic, ou SQL cru); com ela, o
      dono do schema desse banco.
- [ ] Biblioteca de validação das variáveis no projeto Python (pydantic-settings ou outra); o dono
      do schema das variáveis.
- [ ] Parser da conferência de somente leitura (pglast ou sqlglot).
- [ ] Biblioteca de log estruturado (pino e structlog, ou o logger de cada framework).
- [ ] Se o SWR entra na F1-04 ou se o estado do próprio componente basta para as leituras que o tempo
      real altera; a F1-02 não o usa ("Cliente", "Leituras e tempo real").
- [ ] Porquê das escolhas sem motivo registrado: App Router, SWR, FastAPI próprio, uv; ADRs 0017,
      0018, 0019, 0021 e 0022.

**Componentes**

- [ ] Tipos de peça e dependências permitidas na API do chat, no Serviço de agentes e no Worker, e
      no `web`, com o diagrama.
- [ ] Módulos de domínio dos três projetos.

**Conceitos transversais**

- [ ] Credenciais de bot (por processo ou por agente) e credencial de serviço.
- [ ] Como o BFF obtém o IP do navegador atrás do proxy (depende da PaaS, ainda aberta no HLD).
- [ ] Função única que monta a mensagem para cada destinatário.
- [ ] Onde a transação começa e como passa entre módulos.
- [ ] Quem traduz exceção em resposta no Serviço de agentes.
- [ ] Campos de correlação dos logs.
- [ ] O que nunca vai para o log, além do que o HLD já diz.

**Dados e interfaces**

- [ ] Bots na mesma tabela das pessoas, ou não.
- [ ] Diagrama de entidades e relações; forma das tabelas.
- [ ] Paginação das listas além do histórico (o do histórico é por âncora, em "Interfaces").
- [ ] Índice das rotas (BFF, API do chat para o BFF e para os bots, Serviço de agentes) e lista
      de eventos do WebSocket.

**Estados, regras e processos**

- [ ] Subseções de "Estados e regras": pedido ao agente (estados; resposta a uma pergunta como
      pedido novo ou continuação), pergunta pendente (quando termina), mensagem (exclusão com
      menções, notificações e contadores; edição que acrescenta menção), consulta
      a dados de negócio (comparação do lastro), limite de pedidos e teto de custo, presença.
- [ ] Tarefa: concluir uma já concluída, ou reabrir uma aberta.
- [ ] Idempotência da tarefa do PDF (chave no S3, entrega única) e outras rotinas (retenção dos
      PDFs, perguntas pendentes vencidas).

**Valores, configuração e ambiente**

- [ ] Valores de regra marcados "A definir" em "Valores e configuração", e se o limite de pedidos
      é constante ou variável.
- [ ] Nomes, projetos e origem das variáveis de ambiente.
- [ ] Diferenças do ambiente local que mudam o código ou os testes.
- [ ] Endereço usado para assinar a URL do PDF no ambiente local (alcançável pelo navegador, e
      não o nome interno do contêiner do S3).
