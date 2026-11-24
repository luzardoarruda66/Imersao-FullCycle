# Spec: F1-04 Tempo real e não lidas

Plano de implementação da F1-04 do roadmap (`docs/roadmap.md`, Fase 1). O quê e para quem está no
[PRD](prd.md); as regras e os mecanismos, no LLD (`docs/lld.md`), seções "Concorrência e
idempotência", "Transações", "Dados", "Interfaces", "Cliente" e "Valores e configuração". Esta spec
diz o que construir e em que ordem, e aponta para essas seções em vez de repetir as regras.

## Problema

A F1-02 entrega conversas e a FD-03 entrega a conexão em tempo real, mas nenhuma tela usa a
conexão: o membro recarrega a página para ver o que os outros escreveram, não sabe quem está
digitando, só alcança as 50 mensagens mais recentes e não sabe em que conversa há coisa nova.
Sem isso o chat não parece um chat, e a F1-05 (menção), a F1-06 (notificações) e as respostas dos
agentes não têm como aparecer na hora para quem está na tela.

## Solução

A tela de chat passa a reagir a cada evento que chega pela conexão em tempo real:

- a mensagem enviada por outra pessoa aparece sem recarregar, e a minha, em todas as minhas abas;
- o aviso "@usuário está digitando" (uma pessoa) ou "Há N pessoas digitando..." (mais de uma) aparece
  acima do campo de mensagem, e não aparece em canal com mais de 15 membros;
- ao rolar para o começo, a conversa carrega a página anterior do histórico, 50 mensagens por vez;
- cada conversa na lateral mostra a contagem de não lidas e a de menções (esta, zerada até a F1-05),
  que sobe na hora e zera quando o membro lê, em todas as abas dele;
- um indicador na casca mostra "conectado" ou "reconectando".

A API grava, na mesma transação da mensagem, o contador de cada destinatário (ADR 0021), publica
depois do commit um evento por pessoa e aceita um evento do cliente, o "digitando", que ela repassa
só ao vivo, sem guardar.

## Histórias de usuário

**Mensagens sem recarregar**

1. Como membro, quero ver a mensagem de outra pessoa aparecer na conversa aberta sem recarregar,
   para conversar em tempo real.
2. Como membro, quero que a mensagem apareça em até 1 s depois de gravada em 95% dos casos, para
   sentir a conversa ao vivo (critério do FD-03).
3. Como membro, quero ver a minha mensagem aparecer nas minhas outras abas, para o chat estar igual
   onde eu o abri.
4. Como membro, quero que uma mensagem entregue duas vezes (resposta do envio e evento, ou
   reposição depois de reconexão) apareça uma vez só, para a conversa não ter repetições.
5. Como membro, quero que a conversa continue no fim quando eu já estava lendo o fim, para ver a
   mensagem nova sem rolar.
6. Como membro, quero que a rolagem não pule quando eu estou lendo o histórico, para não perder o
   ponto onde estava.
7. Como membro lendo o histórico, quero ver um aviso "Novas mensagens" que me leva ao fim ao ser
   acionado, para saber que a conversa andou.
8. Como membro, quero que o aviso e a ida ao fim funcionem por teclado.
9. Como membro, quero receber só as mensagens das conversas de que participo, para que canal
   privado e conversa direta alheios nunca cheguem a mim.
10. Como membro, quero que, ao reconectar depois de uma queda curta, as mensagens que perdi
    apareçam sozinhas e em ordem (FD-03), para não recarregar.
11. Como membro, quero que, depois de uma queda longa, a tela recarregue pelo histórico sem erro
    técnico (FD-03).

**"Digitando"**

12. Como membro, quero ver "@usuário está digitando" quando uma pessoa digita na conversa, para
    esperar a resposta.
13. Como membro, quero ver "Há N pessoas digitando..." quando mais de uma digita, para saber que
    vem mais de uma mensagem.
14. Como membro, quero que o aviso funcione em canais e em conversas diretas.
15. Como membro, quero que o aviso suma quando a pessoa envia a mensagem, para o aviso não ficar
    parado depois de ela falar.
16. Como membro, quero que o aviso suma quando a pessoa para de digitar por 5 s, para não ficar
    preso se ela desistir.
17. Como membro, quero não ver o meu próprio "digitando", nem nas minhas outras abas.
18. Como membro de um canal com mais de 15 membros, quero que o aviso não apareça, para a tela não
    ficar poluída num canal grande.
19. Como membro, quero que o "digitando" de um canal privado ou de uma conversa direta chegue só a
    quem participa, para a existência dela continuar confidencial.
20. Como membro, quero que quem não participa de uma conversa não consiga disparar "digitando"
    nela, para ninguém aparecer onde não está.
21. Como membro, quero que o aviso de uma conversa só apareça nela, e não nas outras.
22. Como membro, quero que o aviso seja anunciado por leitor de tela de forma discreta, para
    acompanhar sem interrupção a cada tecla.

**Histórico paginado**

23. Como membro, quero que a conversa abra nas 50 mensagens mais recentes, para ler rápido.
24. Como membro, quero que, ao rolar até o começo do que está carregado, as 50 anteriores sejam
    carregadas, para ler o histórico sem esperar a conversa inteira.
25. Como membro, quero que a posição de leitura se mantenha quando a página anterior chega, para
    não perder o lugar.
26. Como membro, quero ver "Início da conversa" quando não há mais mensagens, e que a tela pare de
    pedir páginas.
27. Como membro, quero que nenhuma mensagem se repita nem falte entre as páginas, mesmo se
    chegarem mensagens novas enquanto eu navego.
28. Como membro, quero ver um indicador de "Carregando" enquanto a página vem, e uma mensagem de
    falha com "Tentar de novo" se ela não vier.
29. Como membro, quero poder carregar mais mensagens por teclado, com um botão "Carregar mensagens
    anteriores", além da rolagem.
30. Como membro, quero que pedir uma página de uma conversa de que não participo, ou com uma
    âncora que não é dela, seja recusado com a resposta de conversa inexistente ou de dados
    inválidos, para ninguém ler o que não pode.

**Não lidas e menções**

31. Como membro, quero ver na lateral a contagem de não lidas de cada conversa, para saber onde há
    coisa nova.
32. Como membro, quero que a contagem suba na hora quando chega mensagem numa conversa que não
    está aberta, sem recarregar.
33. Como membro, quero que a contagem não suba para a mensagem que eu mesmo enviei, em nenhuma aba.
34. Como membro, quero que a conversa aberta, visível e com a leitura no fim não mostre contagem
    nova, para o que já li não parecer pendente.
35. Como membro, quero que a conversa aberta numa aba escondida, ou lida só até o meio, continue
    contando, para a contagem ser verdadeira.
36. Como membro, quero que a contagem volte a zero quando eu leio a conversa até a última
    mensagem, para saber que estou em dia.
37. Como membro, quero que a contagem zere também nas minhas outras abas, para não ver um número
    velho em outro lugar.
38. Como membro, quero que, se eu li só até uma mensagem do meio, a contagem mostre quantas
    mensagens de outras pessoas vêm depois dela, para continuar de onde parei.
39. Como membro, quero que uma leitura atrasada, vinda de uma aba defasada, não traga de volta a
    contagem nem apague mensagens novas, para a contagem nunca andar para trás.
40. Como membro, quero ver "99+" quando a contagem passa de 99, para o número caber no selo.
41. Como membro, quero que a conversa sem não lidas não mostre selo.
42. Como membro, quero ver a contagem de menções ao lado da de não lidas, zerada até a F1-05, sem
    erro e sem ficar escondida, para a F1-05 só somar.
43. Como membro, quero que a contagem das conversas já esteja certa ao abrir o chat e ao recarregar,
    para não depender de a aba ter estado aberta.
44. Como membro, quero que os selos sejam lidos por leitor de tela com o nome da conversa, por
    exemplo "geral, 3 não lidas", para saber o que são.
45. Como membro novo, quero que as mensagens de antes da minha conta existir não contem como não
    lidas, para começar em dia.

**Conexão**

46. Como membro, quero ver "conectado" ou "reconectando" na casca, para saber se o que vejo está
    ao vivo.
47. Como membro, quero que o indicador volte a "conectado" quando a conexão volta, para confiar de
    novo.
48. Como membro, quero que o indicador seja lido por leitor de tela quando muda de estado, e não
    só colorido, para não depender da cor.
49. Como membro, quero que o indicador não apareça com alarde na primeira conexão da página, para
    não piscar um "reconectando" ao abrir.

**Pessoa que desenvolve**

50. Como pessoa que desenvolve, quero os eventos novos no pacote `chat-events`, para o compilador
    acusar um lado que não os conhece.
51. Como pessoa que desenvolve, quero que a F1-05 some as menções no mesmo ponto onde esta entrega
    soma as não lidas, para não haver um segundo caminho de contagem.
52. Como pessoa que desenvolve, quero testar o tratamento de cada evento no `web` sem navegador,
    com o socket falso do FD-03.

**Acesso e erros**

53. Como membro sem sessão, quero que as rotas novas recusem como as demais (`sessao_invalida`), e
    que a conexão sem sessão continue recusada.
54. Como membro, quero que a API recuse dados malformados (âncora, mensagem de leitura) com o erro
    de validação no formato único de erro.

## Decisões de implementação

As regras e os mecanismos, com o porquê, ficam no LLD, nas seções citadas; abaixo está o que
construir.

**Arquivo de design.** O Figma do projeto é o `GXeHfkmxrSH9mGMHTweQSP` (`docs/design-system.md`).
A F1-04 precisa de frames novos na página Telas, nos temas claro e escuro, como a F1-02 e a F1-03.
Eles são o primeiro passo da implementação, e o PR que os desenha acrescenta os node-ids a esta
tabela. A convenção é a da spec da F1-02: um frame claro e um escuro, com o sufixo `(escuro)`, e o
tema vem do modo `Semantic` da variable.

| Tela | Frame | Estados |
| --- | --- | --- |
| Conversa | `Tempo real / Conversa / ...` | Uma pessoa digitando; várias digitando; "Novas mensagens" sobre o fim; carregando página anterior; falha ao carregar a anterior; "Início da conversa" |
| Lista de conversas | `Tempo real / Lista / ...` | Selo de não lidas e de menções (zerada, com valor e `99+`); conversa sem selo; conversa aberta |
| Indicador de conexão | `Tempo real / Conexão / ...` | Conectado; reconectando |

Os frames partem dos de referência da Conversa e da Lista de conversas da F1-02. A F1-04 acrescenta
o que a lista acima diz e nada mais: sem reações, sem presença, sem notificações e sem a divisória
"novas mensagens" dentro da conversa.

**Modelo de dados (Banco do chat)**

- Uma tabela de estado de leitura, por pessoa e conversa: a posição de leitura (a última mensagem
  lida, vazia até a primeira leitura), o contador de não lidas e o contador de menções, com a
  restrição de nunca serem negativos. Chave única na dupla (conversa, pessoa); a linha some com a
  conversa ou com a pessoa. O contador de menções existe desde já e só a F1-05 o soma (LLD, "Dados"
  e "Concorrência e idempotência"; [ADR 0021](../adr/0021-contadores-gravados.md)).
- A linha de uma pessoa numa conversa nasce na primeira mensagem de outra pessoa depois que a
  pessoa passou a participar dela. Para o canal público, "participar" é existir como membro do
  workspace (a F1-02 não grava participantes dele): por isso a mensagem de um canal público cria
  ou atualiza a linha de todos os membros menos o autor. Nada é preenchido para trás: mensagens
  anteriores à existência da linha nunca viram não lidas, o que dá o "começar em dia" da história 45 e
  dos membros que já existiam quando a migração rodou.
- Migração nova do TypeORM, com `synchronize` desligado (ADR 0018) e ids em UUID v7 onde houver id
  (ADR 0022).

**API do chat: conversas e mensagens**

- **Contador na transação da mensagem.** O módulo de mensagens, depois de gravar a mensagem e na
  mesma transação, soma 1 a `nao_lidas` de cada participante que não é o autor, criando a linha
  quando falta, num único comando (incremento no próprio `UPDATE`, sem ler antes; LLD,
  "Concorrência e idempotência"). A lista de participantes vem do serviço de participação, que
  passa a oferecer também "quem participa desta conversa" (membros do workspace, no canal
  público).
- **Eventos depois do commit** (ADR 0025), um por pessoa, em duas famílias:
  - `mensagem_criada` para cada participante, o autor inclusive (as outras abas dele): conversa,
    a mensagem (id, autor com id, nome e @usuário, texto, momento) e as contagens da pessoa naquela
    conversa já com a soma desta mensagem. Para o autor, as contagens não mudam.
  - `contagem_atualizada`, só para a pessoa que leu, com as contagens novas da conversa, para as
    outras abas dela zerarem.
- **Ler a conversa.** `POST /v1/conversas/:id/leitura`, com a mensagem até onde a pessoa leu. Pelo
  serviço de participação. A posição só avança (LLD, "Concorrência e idempotência"): uma posição
  igual ou anterior à gravada não muda nada e não publica evento. Quando avança, a mesma transação
  grava a posição e recalcula `nao_lidas` como o número de mensagens de outras pessoas depois dela
  (zero quando a posição é a última; o `UPDATE` trava a linha, então uma mensagem em gravação
  espera e entra na conta); `mencoes` passa a ser zerada e, com a F1-05, a contar as menções depois
  da posição. Devolve as contagens e publica `contagem_atualizada`. Isto resolve o item "Contadores
  quando a leitura avança até uma mensagem que não é a última" das questões em aberto do LLD.
- **Histórico paginado.** `GET /v1/conversas/:id/mensagens` ganha o parâmetro `antes` (id de uma
  mensagem da própria conversa) e passa a devolver `tem_mais` junto com as mensagens. Sem `antes`,
  devolve as 50 mais recentes; com `antes`, as 50 imediatamente anteriores àquela mensagem, sempre
  em ordem cronológica. A âncora vem da posição (data e id) da mensagem, e não de um deslocamento,
  para mensagens novas não deslocarem a página. Âncora que não é UUID ou que não é da conversa:
  `dados_invalidos` (400). O tamanho da página é o `tamanho da página do histórico` (50), que
  substitui o valor fixo da F1-02 e resolve o "A definir (F1-04)".
- **Lista de conversas.** `GET /v1/conversas` passa a trazer, em cada conversa, `nao_lidas` e
  `mencoes`.
- **"Digitando".** Mensagem do cliente ao servidor, `digitando`, com a conversa, validada com o
  schema do pacote. O gateway só repassa mensagens do cliente a quem se registrou por tipo, e quem
  trata é o módulo de conversas, que: confere a participação (sem participação, ignora sem
  resposta), ignora o repetido de uma mesma pessoa e conversa em menos de
  `intervalo mínimo entre "digitando"`, não repassa em conversa com mais de
  `limite de membros para o "digitando"` membros, e publica o evento `digitando` (conversa, id e
  @usuário de quem digita) a cada participante, menos a quem digita. O evento `digitando` é só ao
  vivo: não entra nos eventos de reconexão do Redis, porque repor um "digitando" velho depois da
  queda seria mentira. A interface de publicação do FD-03 ganha a variante sem guarda (LLD,
  "Interfaces").
- **Snapshot OpenAPI** atualizado com as rotas e campos novos; a conferência da CI o exige.
- **Erros:** nenhum código novo. A leitura e a página usam `conversa_inexistente` (404) e
  `dados_invalidos` (400), já no catálogo.

**`chat-events` (pacote)**

- Os eventos de domínio `mensagem_criada`, `contagem_atualizada` e `digitando`, com os schemas Zod
  e os tipos, e a mensagem do cliente `digitando`. O pacote continua dono do formato; a API confere
  antes de publicar e o `web` confere o que chega.

**`web`**

- **Acesso à API do chat:** a leitura da página do histórico entra por uma rota do BFF
  (`GET /api/conversas/:id/mensagens`), consumida com SWR, como a busca de pessoas da F1-03; a
  leitura da conversa (`POST .../leitura`) é uma Server Action (ADR 0024), com a entrada validada
  por Zod. Tudo na camada `server-only`, com a tradução de erro em mensagem de tela.
- **Cache de leituras e tempo real** (LLD, "Cliente", "Leituras e tempo real"): a lista de conversas
  e as páginas de mensagens ficam no SWR (páginas com carregamento infinito para trás). Cada evento
  atualiza o cache direto: `mensagem_criada` acrescenta a mensagem ao fim se a conversa está
  carregada (ignorando um id já presente) e grava as contagens na lista; `contagem_atualizada`
  grava as contagens; `digitando` entra num registro por conversa e expira sozinho. Se o evento
  chega para uma conversa que não está carregada, só a lista muda: ao abrir, a conversa é lida do
  zero.
- **Quando a conversa é lida.** Só uma aba visível, com a conversa aberta e a rolagem no fim, manda
  a leitura, com a última mensagem carregada, depois de uma espera curta para juntar mensagens
  seguidas. Enquanto isso acontece, a conversa aberta, visível e no fim não mostra selo novo
  (história 34). Aba escondida, ou rolagem no meio, não lê.
- **"Digitando" no campo de mensagem.** O campo manda `digitando` ao digitar, no máximo uma vez a
  cada `intervalo de envio do "digitando"`, e só com texto. O aviso some quando chega
  `mensagem_criada` do mesmo autor ou depois do `tempo para o "digitando" sumir`.
- **Indicador de conexão:** o módulo do cliente do FD-03 passa a expor o estado da conexão, e a
  casca mostra "conectado" ou "reconectando" (a primeira conexão da página não pisca "reconectando"). O
  estado é anunciado por região `aria-live` educada.
- **Telas** (LLD, "Cliente"): selo de não lidas e de menções no item da lista; a linha de
  "digitando" acima do campo; o botão "Novas mensagens"; o carregar anteriores; o "Início da
  conversa"; o indicador na casca. Os componentes novos seguem o fluxo "Do Figma para o código" do
  design system.
- **Remove o botão "Atualizar a conversa"** da F1-02 (história 12 daquela spec): com o tempo real
  ele deixa de ser necessário.

**Ambiente.** Nada novo no Compose. Os testes de navegador usam duas sessões do mesmo `e2e`.

**Documentos que esta spec atualiza no mesmo PR**

- LLD: tabela de "Dados" (estado de leitura), "Concorrência e idempotência" (regra de leitura e
  contagem), "Interfaces" (paginação, rotas novas, eventos e a mensagem do cliente, variante sem
  guarda da publicação), "Cliente" (telas e comportamento), "Valores e configuração" (valores
  abaixo), "Questões em aberto" (itens resolvidos).
- HLD: o critério do tempo real e o registro das não lidas gravadas, que o ADR 0021 marca como
  dependência.
- Roadmap: a F1-04 passa a Especificada, com o plano apontando para esta spec e sua issue.

**Valores de regra novos** (donos: LLD, "Valores e configuração")

| Nome | Valor |
| --- | --- |
| Tamanho da página do histórico | 50 mensagens |
| Limite de membros para o "digitando" | 15 |
| Tempo para o "digitando" sumir | 5 segundos sem novo evento |
| Intervalo de envio do "digitando" | 3 segundos |
| Intervalo mínimo entre "digitando" (servidor) | 1 segundo por pessoa e conversa |

**Ordem sugerida**

1. Frames no Figma.
2. Os eventos no `chat-events`.
3. Migração e tabela de estado de leitura.
4. Contador na transação da mensagem e eventos `mensagem_criada`.
5. Leitura e `contagem_atualizada`.
6. Histórico paginado e a lista de conversas com as contagens.
7. "Digitando" no servidor.
8. Snapshot OpenAPI.
9. `web`: acesso à API, cache e tratamento dos eventos.
10. Telas e componentes: selos, "digitando", "Novas mensagens", paginação e indicador.
11. Testes de navegador, de carga e a conferência de queda real.

## Decisões de teste

Um bom teste prova comportamento visível de fora: o que a API devolve, o que um cliente Socket.IO
recebe e em que ordem, o que a tela mostra. Nada de testar a implementação (consultas geradas,
estado interno do gateway, chamadas ao SWR).

**Pontos de teste**

1. **E2E da `chat-api` com HTTP e um cliente Socket.IO de verdade** (o ponto principal), como o
   E2E do FD-03: app escutando de verdade, Postgres `chat_test`, o Redis do Compose e o relógio
   controlado. Prior art: `docs/fd-03-tempo-real/spec.md` ("Decisões de teste") e o E2E de
   conversas da F1-02. Cobre:
   - mensagem enviada: os outros participantes recebem `mensagem_criada` com as contagens somadas;
     o autor recebe o evento sem a contagem subir; quem não participa de canal privado ou conversa
     direta não recebe nada, nem na reposição depois de reconexão;
   - contador: soma por mensagem, não soma para o autor, soma para todos os membros num canal
     público, duas mensagens simultâneas de dois autores somam 2 (sem perda), e nada anterior à
     existência da linha conta;
   - leitura: até a última zera as duas contagens e publica `contagem_atualizada` só para quem leu
     (duas abas dele recebem); até uma mensagem do meio deixa as mensagens de outras pessoas depois
     dela; posição igual ou anterior não muda a contagem nem publica; uma mensagem gravada durante
     a leitura é contada; leitura numa conversa alheia ou com mensagem de outra conversa recusa;
   - histórico: 120 mensagens em três páginas (50, 50, 20) com `tem_mais` verdadeiro, verdadeiro e
     falso, sem repetição nem falta, e uma mensagem nova entre duas páginas não desloca a seguinte;
     âncora inválida ou de outra conversa recusa; conversa alheia responde como inexistente;
   - lista de conversas com `nao_lidas` e `mencoes` certos depois de várias mensagens e de uma
     leitura;
   - `digitando`: chega aos outros participantes e não a quem digita; não chega a quem não
     participa; não é repassado em canal com 16 membros e é com 15; o repetido em menos de 1 s é
     ignorado; não entra na reposição depois de uma reconexão; vindo de quem não participa é
     ignorado sem derrubar a conexão; formato inválido é ignorado;
   - desempenho: 15 membros conectados numa conversa e mensagens a 10 por segundo por 10 s, com p95
     da resposta do envio ao evento recebido ≤ 1 s, escrito como teste (critério do FD-03);
   - todas as rotas novas sem cookie, com cookie inválido e depois de encerrar as sessões
     recusando, e o corpo de erro único.
2. **Vitest e React Testing Library no `web`**, com o socket falso do FD-03 (`.claude/rules/nextjs.md`,
   "Testes"): o tratamento de cada evento no cache (acrescenta ao fim, ignora o repetido, grava as
   contagens, não cria o histórico de uma conversa não carregada); o registro de "digitando" (texto
   de uma pessoa e de várias, expiração com relógio falso, saída ao chegar a mensagem, ignora o
   próprio); o selo (`99+`, sem selo em zero, nome acessível); o envio de `digitando` com a
   espera de 3 s; a decisão de quando ler (aba escondida, rolagem no meio, rolagem no fim); o
   indicador de conexão (conectado, reconectando, sem piscar na primeira conexão); a página do
   histórico (pede com a âncora certa, para quando não há mais). Prior art: os testes do `web` do
   FD-03 (`apps/web/src/lib/realtime`).
3. **E2E de navegador com Playwright** (`./scripts/e2e.sh`), só o que só o navegador prova, com
   dois contextos de navegador de dois membros: um envia e o outro vê a mensagem sem recarregar;
   o segundo vê "@usuário está digitando" e o selo de não lidas numa conversa fechada, que some
   ao abrir; e a leitura do histórico por rolagem até "Início da conversa". Com a conferência do axe
   e o uso só do teclado no carregar anteriores. Prior art: o Playwright da F1-02.

**Conferências à mão, no PR**

- Uma queda real: o contêiner `chat-api` parado e religado com a conversa aberta; o indicador passa
  a "reconectando" e volta, e a mensagem enviada durante a queda aparece sozinha.
- Nota 100 de Acessibilidade no Lighthouse nas telas novas.
- Validação visual de cada frame novo, nos dois temas, em 1440 × 900 (design system, "Validação
  visual").

## Fora do escopo

- Mencionar pessoas e somar o contador de menções, citar, editar, apagar e copiar texto: F1-05. O
  ajuste dos contadores quando uma mensagem é apagada ou editada vai junto.
- Notificações do navegador e a central de notificações: F1-06.
- Presença e perfil em tempo real: F1-07.
- Reações: F2-07. Busca no histórico: F2-05.
- "Digitando" em canal com mais de 15 membros.
- Marcar uma conversa como não lida, silenciar conversa e a divisória "novas mensagens" dentro da
  conversa.
- Resumo da conversa e respostas dos agentes: F1-09 em diante (elas usam os mesmos eventos, mas a
  entrega do bot é delas).
- Redefinir o critério de tempo, o formato do envelope, a conferência de sessão e a recuperação
  depois de queda: são do FD-03.
- Mais de uma instância da API do chat (ADR 0025).
- Celular e tablet.

## Notas

- Decisões desta spec registradas no LLD: tabela de estado de leitura (seção "Dados"); regra de
  leitura e recálculo, e a posição só avança (seção "Concorrência e idempotência"); paginação por
  âncora, rotas novas, eventos e a mensagem do cliente (seção "Interfaces"); comportamento do
  cliente (seção "Cliente"); valores (seção "Valores e configuração"). Nenhuma passa nos três
  testes do ADR, e por isso não há ADR novo: o contador gravado já é o ADR 0021.
- Pontos que o PRD deixou abertos e esta spec resolve: tamanho da página do histórico (50);
  intervalo do "digitando" (5 s para sumir, 3 s entre envios); contagem quando a leitura não chega à
  última mensagem (conta as mensagens de outras pessoas depois da posição); membros de um canal
  público para o limite de 15 (todos os membros do workspace).
- O HLD, seção 6.2, já diz que "digitando" sai pelo mesmo caminho da mensagem; esta spec precisa
  mudar essa frase, porque o "digitando" sai só ao vivo (ver "Documentos que esta spec atualiza").
- A F1-04 depende da F1-02 (Especificada, em implementação): as rotas de conversas e mensagens, o
  serviço de participação e a lista da lateral vêm de lá, e o formato da resposta de mensagens muda
  (`tem_mais`). Implementar depois da F1-02 estar integrada.
- O `GLOSSARY.md` não muda: "Não lidas" já diz "chegaram depois da última leitura do membro".
