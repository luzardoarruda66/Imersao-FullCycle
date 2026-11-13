# LLD — Full Cycle Chat

2026-11-13 · Luiz Carlos · Status: rascunho · HLD: [hld.md](hld.md)

**Onde mora cada fato**

| Fato | Dono |
| --- | --- |
| Arquitetura, contêineres, integrações e motivos | [HLD](hld.md) |
| Decisões com porquê | `docs/adr/`, com o índice na seção "Decisões" deste documento e do HLD |
| Escopo e público | [Product brief](product-brief.md) |
| Vocabulário | [GLOSSARY.md](../GLOSSARY.md), na raiz |
| Linguagem visual (cores, componentes, microtexto) | [Figma](https://www.figma.com/design/GXeHfkmxrSH9mGMHTweQSP/slack--Copy-) |
| Contrato REST da API do chat | `apps/chat-api/openapi.json`, gerado pelo `@nestjs/swagger` (planejado) |
| Contrato REST do Serviço de agentes | `apps/agents/openapi.json`, gerado pelo FastAPI (planejado) |
| Catálogo de códigos de erro | Os snapshots OpenAPI, como enum na resposta de erro de cada rota (planejado) |
| Eventos do WebSocket | Tipos TypeScript em `packages/chat-events/` (planejado) |
| Schema do Banco do chat | `apps/chat-api/migrations/`, migrações do TypeORM (planejado) |
| Schema do Banco dos agentes | A definir |
| Schema do Banco de negócio | Script de carga em `apps/agents/scripts/` (planejado) |
| Schema das variáveis de ambiente | A definir |
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
    migrations/   migrações do Banco do chat                          planejada
  agents/         Serviço de agentes e Worker (Python + ADK),         planejada
                  dois processos do mesmo projeto
    scripts/      script de carga do Banco de negócio                 planejada
packages/
  chat-events/    tipos dos eventos do WebSocket, usados por          planejada
                  chat-api e web
docs/             HLD, LLD, ADRs, brief
```

| Papel | Escolha | Por quê |
| --- | --- | --- |
| Frontend/BFF | Next.js com App Router | Next.js: HLD, seção 5 ([ADR 0002](adr/0002-next-bff-websocket-direto.md)); App Router: a definir |
| Leituras no cliente que o tempo real altera | SWR | A definir |
| Tempo real, no servidor e no cliente | Socket.IO | [ADR 0019](adr/0019-socket-io-tempo-real.md) |
| API do chat | NestJS | HLD, seção 5 |
| ORM e migrações do Banco do chat | TypeORM | [ADR 0018](adr/0018-typeorm-api-do-chat.md) |
| Snapshot do contrato da API do chat | `@nestjs/swagger` | Gera o OpenAPI a partir do código |
| Sessão, cookie e guard de autenticação da API do chat | `@nestjs/authentication` | Cobre o cookie de sessão, o guard global com `@Public()` e o handshake do WebSocket sobre a sessão no Banco do chat ([ADR 0016](adr/0016-sessao-na-api-do-chat.md)), sem escrever a autenticação à mão |
| Hash de senha | scrypt, pelo `PasswordHasher` do `@nestjs/authentication` | [ADR 0023](adr/0023-scrypt-hash-de-senha.md) |
| Teto de requisições por IP | `@nestjs/throttler`, em memória | Pacote oficial do Nest; não exige o Redis, ausente no ambiente local |
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

**Eventos por pessoa (Redis)** — usado pela API do chat para a reconexão (HLD 6.2).

| Operação | Recebe | Devolve | Garante |
| --- | --- | --- | --- |
| Guardar evento | Pessoa e evento | Identificador crescente por pessoa | A ordem dos identificadores é a ordem dos eventos daquela pessoa |
| Ler desde | Pessoa e último identificador confirmado | Os eventos seguintes, ou "perdido" | "Perdido" quando o identificador já saiu da `retenção dos eventos de reconexão`; o cliente então recarrega pelo histórico |

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
- **Participação em canal privado e conversa direta:** o lugar no código onde a API do chat a
  confere está a definir.
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
  a pessoa lê ([ADR 0021](adr/0021-contadores-gravados.md); depende de mudança no HLD).
- **Última leitura:** só avança. A atualização é condicional: grava só se a nova posição for
  posterior à gravada; uma posição igual ou anterior, vinda de uma aba atrasada, não muda nada e
  não altera os contadores.

### Transações

O que precisa ser atômico é do HLD (seção 7, "Regras que pesam no desenho"): a mensagem com as
menções, as notificações e os contadores; a tarefa com a notificação dela. O evento só sai depois
do commit. Onde a transação começa, como passa de um módulo a outro e como o evento é publicado
depois do commit (publicação direta ou tabela de saída) estão a definir.

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
| Chat | Pessoas (perfil, papel de administrador, permissão de dados). E-mail gravado sem espaços nas pontas e em minúsculas, com índice único | planejada |
| Chat | Sessões, no formato do `SessionStore` do `@nestjs/authentication` | planejada |
| Chat | Tentativas de entrar (e-mail normalizado e IP, erros seguidos, fim da espera), do limite de tentativas (HLD 6.1) | planejada |
| Chat | Canais e membros | a detalhar |
| Chat | Conversas diretas | a detalhar |
| Chat | Mensagens (autor pessoa ou bot, citação, marca "dados de negócio") | a detalhar |
| Chat | Menções | a detalhar |
| Chat | Última leitura e contadores por pessoa e conversa | a detalhar |
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
- Paginação: a definir.
- Erros: "Conceitos transversais de implementação", seção "Erros".
- Eventos do WebSocket: tipos em `packages/chat-events/`, consumidos por `chat-api` e `web`.

**Índice das rotas**

O índice por domínio (BFF; API do chat, para o BFF e para os bots; Serviço de agentes) e a lista
de eventos do WebSocket estão a definir. O único comportamento já decidido:

| Método e caminho | Situação | Comportamento |
| --- | --- | --- |
| Envio de mensagem no BFF (caminho a definir) | a detalhar | Mensagem gravada e agente sem receber o pedido: "Conceitos transversais de implementação", seção "Erros" |
| `POST /v1/sessoes` (API do chat) | planejada | Entrar: "Sessão e login". Erros: `credenciais_invalidas` (401), `tentativas_demais` (429, com `details.segundos_restantes`), `dados_invalidos` (400) |
| `DELETE /v1/sessoes/atual` (API do chat) | planejada | Sair: apaga a sessão do cookie e devolve o `Set-Cookie` que o expira |
| `GET /v1/eu` (API do chat) | planejada | O membro da sessão. Sem sessão válida: `sessao_invalida` (401), código de toda rota com sessão |
| `PUT /v1/eu/senha` (API do chat) | planejada | Trocar a senha: "Sessão e login". Erros: `senha_atual_incorreta` (422), `senha_fraca` (422, com `details.regras_faltando`) |

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
- **Trocar a senha.** Exige a senha atual; com ela errada, nada muda. A nova senha cumpre a
  `regra da senha`, e a recusa lista as regras que faltaram. Depois da troca, a sessão atual
  continua e as outras sessões da pessoa são apagadas.
- **Operação.** O comando `contas` da API do chat cria a conta (e-mail e nome), redefine a senha,
  encerra as sessões, dá e tira o papel de administrador e a permissão de dados. Criar e redefinir
  geram uma senha aleatória que cumpre a `regra da senha` e a mostram uma vez só; não há troca
  obrigatória no primeiro acesso. Encerrar as sessões, ou redefinir a senha, apaga todas as
  sessões da pessoa.

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
| `/entrar` | Público | — | Entrar com e-mail e senha | planejada |
| `/` (casca: Rail e menu do usuário) | Sessão | O membro da sessão | Trocar a própria senha, num diálogo; sair | planejada |
| A definir | Sessão | Histórico da conversa | Enviar, editar, apagar, citar; "digitando"; botões de resposta pronta | a detalhar |
| A definir (lateral) | Sessão | Conversas, com não lidas e menções | Abrir conversa | a detalhar |
| A definir | Sessão | Atividade: Menções, DMs, Tarefas | Abrir a mensagem; concluir e reabrir tarefa | a detalhar |
| A definir | Sessão | Perfil próprio e de outras pessoas | Editar o próprio perfil e a presença | a detalhar |
| A definir | Sessão | Busca de pessoas | Abrir conversa direta | a detalhar |
| A definir | Sessão | — | Criar canal; convidar para canal privado | a detalhar |
| A definir | Sessão; conectar e desconectar só para administrador | Agentes e estado de conexão | Conectar e desconectar agente | a detalhar |

**Leituras e tempo real.** A página carrega pelos Server Components. No cliente, o SWR guarda as
leituras que o tempo real altera (mensagens, não lidas, notificações), e cada evento do WebSocket
atualiza esse cache direto, sem nova requisição.

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
- Um 401 no WebSocket fecha a conexão e manda para "Entrar".

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
| Duração da sessão | 30 dias sem uso (PRD da F1-01) | API do chat | A definir |
| Tentativas de login e janela | 5 erradas seguidas; espera de 15 minutos (PRD da F1-01) | API do chat | A definir |
| Teto de tentativas de entrar por IP | 30 em 15 minutos | API do chat | A definir |
| Regra da senha | Mínimo de 8 caracteres, com uma maiúscula, uma minúscula, um número e um símbolo (PRD da F1-01) | API do chat | A definir |
| Validade do identificador de pedido | A definir | API do chat | A definir |
| Retenção dos eventos de reconexão | A definir | API do chat (Redis) | A definir |
| Tempo limite da consulta ao Banco de negócio | A definir | Serviço de agentes e Worker | A definir |
| Tamanho da página do histórico | A definir | API do chat | A definir |

**Variáveis de ambiente**

A definir. O que cada contêiner recebe está no HLD, seção 8, "Configuração e segredos".

## 10. Ambiente de desenvolvimento

O que substitui cada serviço de produção está no HLD, seção 9, "Implantação e ambientes". O
`compose.yaml` da raiz sobe os serviços; os comandos estão no `AGENTS.md` de cada app.

- **Serviços presentes:** `web`, `chat-api`, Postgres e o substituto do S3 (SeaweedFS). O Redis, o
  Serviço de agentes e o Worker entram com o projeto `agents`; até lá, nenhum código do `web` ou
  do `chat-api` pode exigir o Redis para subir localmente.
- **Contêiner das apps:** a imagem não guarda dependências. O repositório inteiro é montado em
  `/workspace`, e o contêiner, ao subir, roda `pnpm install` e fica de pé sem iniciar a app; o
  servidor de desenvolvimento é iniciado à mão, dentro dele. O `node_modules` fica na pasta do
  host, e só o contêiner instala ou adiciona dependências: rodar o pnpm também no host faz os
  dois lados disputarem a mesma pasta.
- **Testes:** os testes E2E da API do chat usam um banco `chat_test`, que o setup dos testes
  cria e migra. Os testes unitários e de componente do `web` rodam no próprio contêiner `web`,
  sem navegador. Os testes de navegador rodam num serviço `e2e` do Compose, com a imagem oficial
  do Playwright, atrás de um `profile` para não subir por padrão.
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
- [ ] Porquê das escolhas sem motivo registrado: App Router, SWR, FastAPI próprio, uv; ADRs 0017,
      0018, 0019, 0021 e 0022.

**Componentes**

- [ ] Tipos de peça e dependências permitidas na API do chat, no Serviço de agentes e no Worker, e
      no `web`, com o diagrama.
- [ ] Módulos de domínio dos três projetos.

**Conceitos transversais**

- [ ] Credenciais de bot (por processo ou por agente) e credencial de serviço.
- [ ] Como o BFF obtém o IP do navegador atrás do proxy (depende da PaaS, ainda aberta no HLD).
- [ ] Lugar da conferência de participação em canal privado e conversa direta.
- [ ] Função única que monta a mensagem para cada destinatário.
- [ ] Onde a transação começa e como passa entre módulos.
- [ ] Publicação do evento depois do commit: direta ou por tabela de saída.
- [ ] Quem traduz exceção em resposta no Serviço de agentes.
- [ ] Campos de correlação dos logs.
- [ ] O que nunca vai para o log, além do que o HLD já diz.
- [ ] Contadores quando a leitura avança até uma mensagem que não é a última da conversa.

**Dados e interfaces**

- [ ] Canais e conversas diretas: uma tabela com tipo, ou tabelas separadas.
- [ ] Bots na mesma tabela das pessoas, ou não.
- [ ] Diagrama de entidades e relações; forma das tabelas.
- [ ] Paginação do histórico e das listas.
- [ ] Índice das rotas (BFF, API do chat para o BFF e para os bots, Serviço de agentes) e lista
      de eventos do WebSocket.

**Estados, regras e processos**

- [ ] Subseções de "Estados e regras": pedido ao agente (estados; resposta a uma pergunta como
      pedido novo ou continuação), pergunta pendente (quando termina), mensagem (exclusão com
      menções, notificações e contadores; edição que acrescenta menção), consulta
      a dados de negócio (comparação do lastro), limite de pedidos e teto de custo, presença e
      "digitando".
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
