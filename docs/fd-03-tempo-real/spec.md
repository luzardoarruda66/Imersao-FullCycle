# Spec: FD-03 Tempo real

Plano de implementação da FD-03 do roadmap (`docs/roadmap.md`, Fundações). O quê e para quem está no
[PRD](prd.md); as regras e os mecanismos, no LLD (`docs/lld.md`), seções "Segurança", "Transações",
"Dados" (Eventos por pessoa), "Interfaces", "Sessão e login", "Cliente", "Valores e configuração" e
"Ambiente de desenvolvimento". Esta spec diz o que construir e em que ordem, e aponta para essas
seções em vez de repetir as regras.

## Problema

Hoje o navegador só vê o que pede: não existe canal pelo qual a API do chat empurre algo para o
membro. Sem ele, nenhuma mensagem, notificação ou resposta de agente chega sem recarregar a página,
e uma queda de rede deixaria o membro com a conversa defasada sem que ninguém soubesse. A F1-04 e a
F1-07 dependem desse canal, e ele tem de nascer com a autenticação pela sessão, o formato único dos
eventos e a recuperação do que se perdeu, porque consertar isso depois de haver telas em cima custa
caro.

## Solução

Um membro com sessão aberta tem, em cada aba, uma conexão em tempo real com a API do chat,
autenticada pelo mesmo cookie da sessão. Por ela chegam eventos tipados, definidos num pacote
compartilhado entre a API e o `web`. A API guarda os eventos recentes de cada pessoa; depois de uma
queda, a aba pede o que perdeu a partir do último evento que confirmou e recebe, em ordem e sem
repetição, o que faltou. Se a queda passou do que a API guarda, ou se o armazenamento dos eventos
foi perdido, a aba é avisada e recarrega pelo histórico. Quando a sessão acaba, a API fecha a
conexão em poucos segundos e a aba volta para "Entrar".

A entrega não mostra nada novo ao membro: a tela de chat e o indicador de conexão são da F1-04. Ela
prova o canal ponta a ponta com um evento de diagnóstico e deixa uma interface de publicação pronta
para a F1-02 e a F1-04 usarem. Ela também traz o Redis para o ambiente local, que o roadmap deixava
para o projeto `agents`.

## Histórias de usuário

**Conectar**

1. Como membro, quero que o chat abra a conexão em tempo real sozinho quando eu entro, para receber
   atualizações sem fazer nada.
2. Como membro, quero que a conexão use o cookie da minha sessão, para não precisar informar
   credencial nenhuma e para que nenhuma fique legível pelo código da página.
3. Como membro, quero que uma conexão sem sessão válida seja recusada, para que ninguém ouça os
   eventos de outra pessoa.
4. Como membro, quero que uma conexão vinda de uma origem que não é a do produto seja recusada,
   para que outro site aberto no meu navegador não use minha sessão para ouvir meus eventos.
5. Como membro, quero ter uma conexão por aba, para que todas as abas abertas recebam o que me
   diz respeito.
6. Como membro, quero que a aba reconecte sozinha depois de uma queda de rede, para não ter de
   recarregar a página.

**Receber só o que é meu**

7. Como membro, quero receber apenas os eventos publicados para mim, para não ver o que acontece em
   conversas de que não participo.
8. Como membro, quero que a recuperação depois de uma queda também traga só os meus eventos, para
   que a volta não vaze o que a conexão ao vivo não vazaria.
9. Como membro sem permissão de dados, quero que o evento guardado para mim seja o da versão
   bloqueada, para que a reposição não entregue depois o conteúdo que a conexão ao vivo escondeu.

**Recuperar o que perdi**

10. Como membro, quero receber, ao reconectar dentro de 15 minutos, todos os eventos que perdi, para
    não perder mensagens numa queda curta.
11. Como membro, quero que os eventos reenviados venham na ordem em que aconteceram, para que a
    conversa não apareça embaralhada.
12. Como membro, quero que nenhum evento chegue duas vezes, nem o que saiu ao vivo durante a
    reposição, para que uma mensagem não apareça repetida.
13. Como membro, quero que os eventos reenviados tenham o mesmo formato dos ao vivo, para que a
    tela trate uns e outros do mesmo jeito.
14. Como membro, quero ser avisado de que o que perdi não está mais guardado quando a queda passou
    de 15 minutos, para recarregar pelo histórico em vez de achar que estou em dia.
15. Como membro, quero o mesmo aviso quando o armazenamento dos eventos foi perdido ou falhou, para
    que um defeito do servidor nunca me deixe com buracos sem eu saber.
16. Como membro, quero que a recarga pelo histórico não mostre erro técnico, para que uma queda
    longa seja só um recarregar.
17. Como membro com duas abas, quero que cada aba lembre do seu último evento, para que uma aba que
    ficou suspensa por mais tempo não atrapalhe a que ficou ativa.

**Sessão**

18. Como membro, quero que, ao sair, as conexões daquele navegador fechem em até 5 s, para que
    ninguém use minha conta depois de eu sair.
19. Como membro, quero o mesmo quando a sessão vence sem uso, para que a conexão não sobreviva à
    sessão.
20. Como membro, quero o mesmo quando a operação encerra minhas sessões, ou redefine minha senha,
    mesmo que o comando rode fora do processo que mantém a conexão.
21. Como membro, quero que a conexão de outro navegador meu continue aberta quando só uma sessão
    acabou, para que sair de um lugar não me tire dos outros.
22. Como membro, quero que a aba, ao perder a sessão, volte para "Entrar" e depois do login volte
    ao lugar onde eu estava, para não perder o contexto.
23. Como membro, quero que a aba não fique tentando reconectar sem fim quando a sessão acabou, para
    que ela não gaste rede nem gere erro na tela.

**Pessoa que desenvolve**

24. Como pessoa que desenvolve, quero um pacote único com o formato de cada evento, para que o
    servidor e o `web` falem a mesma língua e o compilador acuse um evento novo que um lado não
    conhece.
25. Como pessoa que desenvolve, quero que o servidor recuse publicar um evento fora do formato, para
    que um erro de código não vire lixo na tela de todos.
26. Como pessoa que desenvolve, quero uma única interface para publicar um evento a uma pessoa, para
    que a guarda, a ordem e a entrega ao vivo não precisem ser refeitas em cada funcionalidade.
27. Como pessoa que desenvolve, quero publicar o evento só depois do commit da gravação que o
    causou, para que ninguém veja o que a transação desfez.
28. Como pessoa que desenvolve, quero um evento de diagnóstico, para provar a entrega e a reposição
    sem depender de canais, mensagens ou telas.
29. Como pessoa que desenvolve, quero um cliente do `web` que guarde o último evento e entregue os
    eventos a quem se inscreveu pelo tipo, para que a F1-04 só escreva o que fazer com cada evento.
30. Como pessoa que desenvolve, quero que o cliente do `web` seja testável com um socket falso, para
    cobrir a reconexão sem navegador.

**Operação e confiabilidade**

31. Como operação, quero que a API do chat suba com o Redis do ambiente local e falhe com o nome da
    variável que falta, para descobrir um erro de configuração na subida.
32. Como operação, quero que a queda do Redis não derrube o chat, para que só a reposição se
    degrade e o resto siga funcionando.
33. Como operação, quero que o que o Redis guarda tenha um prazo, para que a memória não cresça sem
    limite com quem nunca volta.
34. Como membro, quero que a entrega ao vivo leve no máximo 1 s em 95% dos eventos, para sentir as
    mudanças na hora.

## Decisões de implementação

As regras e os mecanismos, com o porquê, ficam no LLD, nas seções citadas; abaixo está o que
construir.

**`chat-events` (existe a partir desta entrega)**

- Um projeto pnpm independente, com os schemas Zod de cada evento e os tipos inferidos deles, usado
  por `chat-api` e `web` como dependência local ([ADR 0017](../adr/0017-projetos-pnpm-independentes.md)).
  O Zod dá o formato que a API confere antes de publicar (história 25).
- Três mensagens do servidor para o cliente: o evento de domínio, com o envelope comum (identificador,
  tipo, dados, momento); `pronto`, que informa o ponto de partida da reposição; e `perdido`. O que o
  cliente manda é só o último evento que confirmou, no handshake.
- A entrega traz um único evento de domínio, o `diagnostico`, com uma mensagem de texto. Os tipos
  das mensagens, das notificações e do resto entram com as funcionalidades que os emitem.

**API do chat: módulo de tempo real**

- Gateway Socket.IO só com o transporte WebSocket, sem polling ([ADR 0019](../adr/0019-socket-io-tempo-real.md)),
  que autentica o handshake pelo cookie com o `@nestjs/authentication`, confere a origem contra
  `WEB_ORIGIN` e recusa a conexão sem os dois. A recusa devolve `sessao_invalida` ou
  `origem_invalida`, do catálogo de códigos de erro.
- Cada conexão entra numa sala da pessoa. Um evento publicado a uma pessoa sai para a sala dela e
  entra nos eventos guardados dela.
- A interface de publicação recebe a pessoa e o evento já no formato do pacote. Quem chama decide os
  destinatários (a F1-02 o faz com o serviço de participação); o gateway não conhece conversas.
  Cada pessoa é um destinatário próprio, o que já cobre o evento de dados de negócio emitido pessoa
  a pessoa ([ADR 0020](../adr/0020-dados-de-negocio-pessoa-a-pessoa.md)).
- A publicação de uma pessoa é serializada, para a ordem de saída ser a ordem de gravação. Quem
  chama publica depois do commit: a decisão e a alternativa descartada estão no
  [ADR 0025](../adr/0025-publicacao-direta-depois-do-commit.md).
- Eventos por pessoa no Redis, com a retenção, a regra do "perdido" e a época: LLD, seção 5,
  "Eventos por pessoa (Redis)". A reposição segura os eventos ao vivo da conexão até terminar de
  reenviar, e descarta os que o reenvio já cobriu.
- A conferência de sessão: a cada `intervalo de conferência das sessões`, uma consulta só pelas
  sessões das conexões abertas; as que não valem mais recebem o fechamento. O mecanismo serve a
  quem encerra a sessão pelo comando `contas`, que roda em outro processo, e à validade por uso:
  LLD, seção 6.2, "Sessão e login".
- Com o Redis fora, a publicação segue ao vivo e a falha troca a época; o que acontece depois está
  em "Eventos por pessoa (Redis)". O chat nunca deixa de responder por causa do Redis.
- Cliente do Redis: `ioredis` (Streams, reconexão automática), um módulo de conexão injetável. As
  variáveis novas são `REDIS_URL`, validada no schema de variáveis na subida, e nenhuma outra: a
  origem permitida é a `WEB_ORIGIN` que já existe.
- O evento de diagnóstico não tem rota pública: quem o publica é um serviço chamado pelos testes,
  para o canal não ter uma porta que alguém precise proteger.

**`web`: cliente da conexão**

- Um módulo do cliente, sem tela, montado na casca da área logada, que abre a conexão com o cookie
  (`withCredentials`) na URL `NEXT_PUBLIC_CHAT_WS_URL` (LLD, seção 8, "Cliente"), guarda o último
  evento confirmado por aba e entrega os eventos a quem se inscreveu pelo tipo.
- No `perdido`, ou na perda da sessão (`sessao_invalida` na recusa, ou o fechamento do servidor),
  o cliente deixa de reconectar e recarrega a página atual: o servidor do `web` revalida a sessão,
  o BFF apaga o cookie e o proxy leva a "Entrar" sem laço (LLD, seção 8, "Sessão no cliente").
- O cliente do Socket.IO entra por uma fábrica injetável, para os testes usarem um socket falso.

**Ambiente**

- O `compose.yaml` ganha o serviço `redis`, com `healthcheck`, e o `chat-api` passa a depender dele
  estar saudável; as variáveis do contêiner e do `.env.example` ganham `REDIS_URL`, com o host
  sendo o nome do serviço do Compose (`AGENTS.md`, "Rede entre serviços"). O E2E usa um banco
  lógico do Redis só dele, que o setup limpa.
- O `AGENTS.md` da raiz ganha o `redis` na tabela de serviços; o roadmap tira da FD-03 a pendência
  de o Redis entrar com o projeto `agents`.

**Ordem sugerida**

1. O pacote `chat-events` e a dependência nos dois projetos.
2. Redis no Compose, módulo de conexão e variável de ambiente.
3. Eventos por pessoa: guardar, ler desde, época, retenção.
4. Gateway: handshake, origem, sala, conferência de sessão.
5. Publicação, serialização, reposição com os eventos ao vivo seguros, evento de diagnóstico.
6. O cliente do `web`, montado na casca.
7. Testes de carga e de queda, e a atualização dos documentos.

## Decisões de teste

Um bom teste prova comportamento visível de fora: o que um cliente Socket.IO recebe, em que ordem e
quando. Nada de testar a implementação (chamadas ao Redis, estado interno do gateway).

**Pontos de teste**

1. **E2E da `chat-api` com um cliente Socket.IO de verdade** (o ponto principal): a app escutando
   de verdade (`.claude/rules/nestjs.md`, "Testes"), Postgres `chat_test` e o Redis do Compose, com
   o relógio controlado. Prior art: o E2E de entrar, que cria a app, as contas e as sessões. Cobre:
   - handshake com cookie válido, sem cookie, com cookie inválido e com sessão encerrada; origem
     certa, outra origem e origem ausente;
   - o evento de diagnóstico chegando só à pessoa certa, com duas pessoas e duas abas de uma delas;
   - queda e reconexão com o último evento: reposição em ordem, sem duplicar, igual ao formato ao
     vivo, e a mesma conexão recebendo um evento ao vivo durante a reposição, sem repetição;
   - "perdido" depois da retenção (relógio avançado), com o armazenamento apagado, e com a época
     trocada por falha de gravação;
   - sessão encerrada por `sair`, por vencimento, por `encerrar-sessoes` e por troca de senha, em
     até 5 s, sem derrubar outro navegador do mesmo membro;
   - evento fora do formato recusado antes de sair;
   - com o Redis parado, o handshake e a entrega ao vivo seguem, e a reconexão seguinte recebe
     "perdido";
   - desempenho: 50 conexões e 20 eventos por segundo por 10 s, com p95 da gravação à chegada
     ≤ 1 s, escrito como teste.
2. **Vitest no `web`**, com um socket falso: o cliente guarda o último evento e o manda ao
   reconectar, entrega os eventos por tipo, ignora o repetido, recarrega no `perdido` e na perda da
   sessão sem tentar reconectar, e abre uma conexão só por aba. Prior art: os testes unitários do
   `web` (`apps/web/src/lib`, com Vitest).

**Conferências à mão, no PR**

- Uma queda de rede real: o contêiner `chat-api` parado e religado enquanto uma aba está aberta, e
  a conferência de que a aba reconecta e recebe o diagnóstico publicado durante a queda.

## Fora do escopo

- Mostrar mensagens, "digitando", contagem de não lidas e o histórico paginado: F1-04.
- Presença, perfil e tema: F1-07.
- Notificações do navegador (F1-06) e indicador de conexão na interface.
- A conferência de participação em conversas: a F1-02 a oferece, e quem publica a chama. O gateway
  entrega por pessoa e não conhece conversas.
- Mais de uma instância da API do chat, com a publicação entre instâncias.
- Tabela de saída, para publicar também o evento que ficaria entre o commit e a queda do processo
  (ADR 0025).
- Eventos do cliente para o servidor, como "digitando" (F1-04).
- Cliente do Redis para o projeto `agents`: o Redis do Compose é compartilhado, mas o que o
  `agents` guarda nele é da FD-04.

## Notas

- A FD-02 continua Pendente no roadmap; a FD-03 depende dela só pelo Banco do chat e pelas sessões,
  que a F1-01 já entregou.
- O Redis entra no ambiente local com esta entrega, e não com o projeto `agents` como o roadmap
  dizia: o LLD, seção 10, muda junto.
- Decisões registradas nesta especificação: ADR 0025 (publicação direta depois do commit); o resto
  está no LLD.
