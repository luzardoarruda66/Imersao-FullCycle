# Spec: F1-02 Canais e conversas diretas

Plano de implementação da F1-02 do roadmap (`docs/roadmap.md`, Fase 1). O quê e para quem está no
[PRD](prd.md); as regras e os mecanismos, no LLD (`docs/lld.md`), seções "Segurança", "Erros",
"Dados", "Interfaces", "Cliente" e "Valores e configuração". Esta spec diz o que construir e em que
ordem, e aponta para essas seções em vez de repetir as regras.

## Problema

Hoje o membro entra no produto (F1-01) e cai numa tela vazia: não há onde escrever, e a aposta do
produto, o agente dentro da conversa, não tem onde acontecer. Canais públicos, canais privados e
conversas diretas são a base de toda a Fase 1: tempo real, não lidas, menções, notificações e agentes
dependem de existir uma conversa e de a API saber quem participa dela.

## Solução

O membro vê na lateral os canais públicos, os canais privados de que participa e as suas conversas
diretas, abre uma delas, lê as 50 mensagens mais recentes e escreve novas. Cria um canal público ou
privado, convida membros para um canal privado e abre uma conversa direta escolhendo outro membro
numa lista. Quem não participa de um canal privado não o vê na lista, nem por link, nem pela API.

Sem tempo real nesta entrega: a conversa mostra o que existe ao abrir e ao recarregar, e depois de
enviar a própria mensagem. O tempo real, a paginação e as não lidas são da F1-04.

## Histórias de usuário

**Lista de conversas**

1. Como membro, quero ver na lateral os canais públicos, os canais privados de que participo e as
   minhas conversas diretas, separados, para achar onde conversar.
2. Como membro, quero os canais em ordem alfabética, para achar um canal sem procurar.
3. Como membro, quero ver cada conversa direta pelo nome da outra pessoa, para saber com quem falo.
4. Como membro, quero que a lista funcione inteira por teclado, para não depender do mouse.
5. Como membro, quero que a lista siga o tema claro ou escuro do design system, para ler bem em
   qualquer tema.

**Ler e escrever**

6. Como membro, quero abrir uma conversa e ler as 50 mensagens mais recentes, da mais antiga para a
   mais nova, para ter o contexto.
7. Como membro, quero ver autor e horário em cada mensagem, para saber quem disse e quando.
8. Como membro, quero escrever uma mensagem e enviá-la com Enter, para conversar sem sair do
   teclado.
9. Como membro, quero que a mensagem vazia ou só de espaços não seja enviada, para não poluir a
   conversa.
10. Como membro, quero que mensagens com mais de 4.000 caracteres sejam recusadas com um aviso, para
    saber que preciso dividir o texto.
11. Como membro, quero ver a minha mensagem aparecer na conversa depois de enviar, sem recarregar.
12. Como membro, quero ver como atualizar a conversa para ler o que os outros escreveram, enquanto o
    tempo real não existe.
13. Como membro, quero ver uma mensagem de falha quando o envio não chega à API, mantendo o texto
    que escrevi, para tentar de novo sem digitar tudo.
14. Como membro, quero ler uma conversa vazia com um convite a escrever a primeira mensagem, para
    saber que está tudo certo.

**Canais públicos**

15. Como membro, quero participar de todos os canais públicos sem convite, para falar com o
    workspace inteiro.
16. Como membro, quero ver um canal público criado por outra pessoa na minha lista, para entrar na
    conversa.

**Criar canal**

17. Como membro, quero criar um canal informando o nome e escolhendo entre público e privado, para
    organizar um assunto.
18. Como membro, quero que o formulário de criar canal não traga tipo escolhido de antemão, para não
    expor conteúdo por engano num canal público.
19. Como membro, quero ver o erro na própria tela quando o nome está em branco ou passa de 80
    caracteres, para corrigir sem esperar a API.
20. Como membro, quero que o nome seja recusado quando já existe um canal com ele, sem diferenciar
    maiúsculas e minúsculas e ignorando espaços nas pontas, para que dois canais não se confundam.
21. Como membro, quero que o canal público recém-criado apareça na lista de todos, para que o
    workspace o encontre.
22. Como membro, quero que o canal privado recém-criado apareça só para mim, para decidir quem
    convidar antes de mais alguém vê-lo.
23. Como membro, quero cair no canal logo depois de criá-lo, para começar a conversar.
24. Como membro, quero criar o canal usando só o teclado, enviando com Enter.

**Canal privado e convite**

25. Como membro de um canal privado, quero convidar outros membros escolhendo-os numa lista, para
    que só quem precisa participe.
26. Como convidado, quero ver o canal privado na minha lista depois do convite, para participar.
27. Como convidado, quero ler todo o histórico do canal, inclusive o anterior ao convite, para ter
    o contexto.
28. Como membro, quero que convidar quem já participa não duplique nem dê erro, para não me
    preocupar com quem já está.
29. Como membro, quero que a lista de convite não mostre quem já participa, para não escolher quem
    já está dentro.
30. Como membro, quero ver quem participa de um canal privado, para saber quem lê o que escrevo.
31. Como membro, quero que quem não é membro do canal privado não possa convidar ninguém, para que
    o convite seja uma decisão de quem está dentro.

**Canal privado invisível**

32. Como membro de fora, quero que o canal privado não apareça na minha lista, para que a existência
    dele seja confidencial.
33. Como membro de fora, quero que abrir o endereço de um canal privado mostre a mesma tela de uma
    conversa que não existe, para que a resposta não confirme que o canal existe.
34. Como membro de fora, quero que a API recuse ler e escrever num canal privado alheio com a mesma
    resposta de uma conversa que não existe, para que ninguém descubra canais pela API.
35. Como membro de fora, quero que a API recuse convidar alguém para um canal privado em que não
    estou.
36. Como membro, quero que o canal privado criado por mim não apareça para quem não convidei, em
    nenhuma lista, para controlar quem o vê.

**Conversa direta**

37. Como membro, quero ver a lista de membros do workspace para abrir uma conversa direta com
    alguém, para falar em particular.
38. Como membro, quero que abrir uma conversa direta com quem já tenho conversa leve à existente,
    para que haja uma conversa só por par.
39. Como membro, quero que duas pessoas abrindo a conversa direta uma com a outra ao mesmo tempo
    terminem numa conversa só, para não existirem duas.
40. Como membro, quero que só eu e a outra pessoa vejamos a conversa direta, nem na lista nem pela
    API, para falar em particular.
41. Como membro, quero que abrir uma conversa direta comigo mesmo seja recusado, para não criar uma
    conversa sem sentido.
42. Como membro, quero que a lista de membros mostre só o nome, para escolher com quem falar sem
    precisar do perfil, que é da F1-03.

**Acesso e erros**

43. Como membro sem sessão, quero que qualquer rota de conversas recuse os dados e me leve a entrar,
    para que nada apareça sem sessão (F1-01).
44. Como membro, quero ver uma tela clara de conversa inexistente, com caminho de volta, quando o
    endereço não leva a lugar nenhum, para voltar à lista.
45. Como membro, quero ver a porta "Erro de sessão" quando a API cai, e não a tela de entrar, como
    já acontece na F1-01.
46. Como membro, quero que a API recuse dados malformados (nome, tipo, convidado) com erro de
    validação no formato único de erro, para receber uma resposta previsível.

## Decisões de implementação

**Arquivo de design.** O Figma do projeto é o `GXeHfkmxrSH9mGMHTweQSP` (`docs/design-system.md`).
Os frames desta entrega estão na seção `F1-02 Canais e conversas diretas` (`2060:68853`) da página
Telas, nos temas claro e escuro, e são o que o código implementa pelo fluxo "Do Figma para o código"
do design system. Cada tela tem dois frames: o claro, sem sufixo, e o escuro, com o sufixo
`(escuro)`. O tema vem do modo `Semantic` da variable, definido no próprio frame (`Light` ou `Dark`):
a página Telas tem o modo `Dark` por padrão, então um frame sem o modo explícito aparece escuro.

| Tela | Frame (claro) | Node-id claro | Node-id escuro |
| --- | --- | --- | --- |
| Conversa | `Canais / Conversa / Canal público` | `2061:68930` | `2061:69405` |
| Conversa | `Canais / Conversa / Canal privado` | `2061:69864` | `2061:70199` |
| Conversa | `Canais / Conversa / Canal vazio` | `2061:70530` | `2061:70874` |
| Conversa | `Canais / Conversa / Conversa não encontrada` | `2061:71218` | `2061:71508` |
| Conversa | `Canais / Conversa / Conversa direta` | `2061:71798` | `2061:72149` |
| Conversa | `Canais / Conversa / Falha no envio` | `2061:72495` | `2061:72964` |
| Conversa | `Canais / Conversa / Mensagem acima do limite` | `2061:73433` | `2061:73886` |
| Participantes | `Canais / Participantes / Canal privado` | `2064:71714` | `2064:72307` |
| Criar canal | `Canais / Criar canal / Padrão` | `2064:72876` | `2064:73392` |
| Criar canal | `Canais / Criar canal / Erro no nome` | `2064:73908` | `2064:74424` |
| Criar canal | `Canais / Criar canal / Nome em uso` | `2064:74940` | `2064:75457` |
| Criar canal | `Canais / Criar canal / Tipo não escolhido` | `2064:75974` | `2064:76497` |
| Criar canal | `Canais / Criar canal / Enviando` | `2064:77020` | `2064:77537` |
| Criar canal | `Canais / Criar canal / Falha ao criar` | `2064:78054` | `2064:78572` |
| Convidar | `Canais / Convidar / Padrão` | `2065:76234` | `2065:76838` |
| Convidar | `Canais / Convidar / Pessoas escolhidas` | `2065:77414` | `2065:77994` |
| Convidar | `Canais / Convidar / Ninguém para convidar` | `2065:78574` | `2065:79102` |
| Convidar | `Canais / Convidar / Enviando` | `2065:79630` | `2065:80214` |
| Convidar | `Canais / Convidar / Falha ao convidar` | `2065:80796` | `2065:81377` |
| Conversa direta | `Canais / Conversa direta / Escolher membro` | `2065:81958` | `2065:82515` |
| Conversa direta | `Canais / Conversa direta / Carregando membros` | `2065:83072` | `2065:83561` |
| Conversa direta | `Canais / Conversa direta / Abrindo` | `2065:84050` | `2065:84607` |
| Conversa direta | `Canais / Conversa direta / Falha ao abrir` | `2065:85164` | `2065:85722` |
| Lista de conversas | `Canais / Lista / Carregando` | `2065:86280` | `2065:86386` |
| Lista de conversas | `Canais / Lista / Erro ao carregar` | `2065:86492` | `2065:86595` |

Os frames partem dos de referência das seções Conversa, Casca e Diálogos da casca, já sem o que é de
outras fases: a seção Agentes, a presença e o status, o tópico do canal, as não lidas, o botão `@`
do campo de mensagem, a aba Atividade e o `ThemeToggle` do Rail. O que é específico desta entrega:

- **Lista de conversas:** a seção das conversas diretas se chama "Conversas diretas".
- **Atualizar a conversa:** um `IconButton` com `icon/rotate-ccw` no cabeçalho (história 12),
  à esquerda do botão de participantes nos canais privados.
- **Criar canal:** sem tópico e sem interruptor. O tipo é um grupo de dois `RadioOption`, Público e
  Privado, sem nenhum escolhido de antemão (história 18); no estado `Tipo não escolhido`, os dois ficam
  com a borda `danger` e a mensagem "Escolha se o canal é público ou privado.".
- **Convidar e seletor de membro:** sem campo de busca e sem `@usuário` nem cargo, só o nome (história
  42). O seletor da conversa direta não lista o próprio membro (história 41), e o Convidar não lista
  quem já participa (história 29).
- **Participantes:** só os nomes, com o botão "Convidar pessoas".
- **Falha no envio:** o campo mantém o texto e um `Toast` de erro avisa que o envio não chegou à API
  (história 13).

**Modelo de dados (Banco do chat)**

- Uma tabela de conversas com o tipo (canal público, canal privado ou direta), e uma de
  participantes, com a conversa e o membro (LLD, "Dados"; decisão tomada nesta spec). Canal público
  não grava participantes: todo membro participa. Canal privado e conversa direta gravam.
- A tabela de mensagens guarda o texto, o autor (membro), a conversa e `created_at`; os campos de
  citação, bot e "dados de negócio" entram com as funcionalidades que os usam.
- Unicidade: nome do canal sem diferenciar maiúsculas, para canais; e um índice para que o par de
  membros tenha uma conversa direta só, qualquer que seja a ordem do par. Ambas por índice único,
  para a condição de corrida do item 39 terminar numa conversa só (LLD, "Concorrência e
  idempotência").
- Ids em UUID v7 gerados na aplicação (ADR 0022). Migração nova do TypeORM, com `synchronize`
  desligado (ADR 0018).

**Módulos da API do chat**

- **Conversas:** cria canal, convida, abre conversa direta, lista as conversas visíveis de um
  membro e devolve uma conversa. Dono do serviço de participação: uma função só, chamada por toda
  rota que lê ou escreve numa conversa, que devolve a mesma resposta de "conversa inexistente" para
  quem não participa de canal privado ou conversa direta (LLD, "Segurança").
- **Mensagens:** envia (valida texto não vazio depois de aparar espaços, até 4.000 caracteres) e
  lista as 50 mais recentes em ordem cronológica, sempre pelo serviço de participação (LLD,
  "Valores e configuração").
- **Membros:** lista de id e nome dos membros para o seletor de convite e de conversa direta. Mais
  nenhum campo, porque o perfil é da F1-03.
- **Rotas, com sessão** (nomes e códigos de erro no snapshot OpenAPI, LLD "Interfaces"):
  - `GET /v1/conversas`: as conversas do membro, separadas por tipo.
  - `POST /v1/conversas/canais`: cria canal (nome, tipo).
  - `POST /v1/conversas/diretas`: abre ou devolve a conversa direta com um membro.
  - `GET /v1/conversas/:id`: a conversa, e para canal privado a lista de participantes.
  - `POST /v1/conversas/:id/participantes`: convida, só em canal privado.
  - `GET /v1/conversas/:id/mensagens` e `POST /v1/conversas/:id/mensagens`.
  - `GET /v1/membros`.
- **Erros:** o corpo único do LLD, "Erros". Códigos novos desta entrega: conversa inexistente (404),
  nome de canal em uso (409), conversa direta consigo mesmo (422), conversa que não aceita convite
  (422, para canal público e conversa direta) e dados inválidos (400), com os valores no enum do
  snapshot.
- **Snapshot OpenAPI:** atualizado com as rotas novas, e a conferência da CI (FD-08) o exige.

**Módulos do `web`**

- **Acesso à API do chat:** as funções de leitura e de escrita das rotas acima, na camada
  `server-only` que a F1-01 criou, com a tradução dos erros novos em mensagens de tela.
- **Server Actions:** criar canal, convidar, abrir conversa direta e enviar mensagem (ADR 0024),
  cada uma validando a entrada com Zod antes de chamar a API, como na F1-01. A leitura da lista e das
  mensagens é feita pelos Server Components.
- **Telas** (LLD, "Cliente"): a sidebar da casca logada com as conversas; a área da conversa, com as
  mensagens, o campo de envio e a lista de participantes dos canais privados; os diálogos Criar canal
  e Convidar; o seletor de membro para a conversa direta. O endereço da conversa é a rota que
  substitui o "A definir" da tabela de telas do LLD, que passa a `planejada`.
- **Atualizar a conversa:** um botão de atualizar enquanto não há tempo real (história 12). Depois
  de enviar, a lista é relida.
- **Componentes:** os primitivos novos que os frames pedem (item de lista da sidebar, bolha de
  mensagem, campo de mensagem, seletor), pelo fluxo do design system.

**Ambiente.** Nada novo no Compose. As migrações rodam no contêiner `chat-api`, como na F1-01.

## Decisões de teste

Um bom teste prova comportamento visível de fora: a resposta HTTP, o que a tela mostra. Nada de
testar a implementação (chamadas internas, consultas geradas).

**Pontos de teste**

1. **E2E HTTP da API do chat** (o ponto principal): Supertest contra a app Nest de verdade e um
   Postgres de verdade, no banco `chat_test`. Cobre:
   - criar canal público e privado, nome em branco, com mais de 80 caracteres, repetido com outra
     caixa e com espaços nas pontas;
   - lista de conversas: o canal público de outro membro aparece; o privado alheio não; a conversa
     direta alheia não;
   - canal privado alheio: leitura, envio, convite e a própria conversa respondem igual a uma
     conversa inexistente, e igual ao ID que nunca existiu;
   - convite: feito por participante, recusado a quem está fora, repetido sem duplicar, em canal
     público e conversa direta recusado;
   - convidado lê todo o histórico, inclusive o anterior ao convite;
   - conversa direta: abrir duas vezes devolve a mesma, abrir ao mesmo tempo (duas requisições
     paralelas, uma de cada lado) termina em uma só, consigo mesmo recusado;
   - mensagem: vazia ou só de espaços recusada, com 4.000 caracteres aceita, com 4.001 recusada,
     leitura devolvendo as 50 mais recentes em ordem cronológica com uma conversa de mais de 50;
   - todas as rotas sem cookie, com cookie inválido e depois de encerrar as sessões recusando;
   - corpo de erro único, inclusive para JSON malformado.
   Prior art: o E2E HTTP da F1-01 (`docs/f1-01-entrar/spec.md`, "Decisões de teste") e o esqueleto
   com Supertest e Vitest da `chat-api`.
2. **Unitário e de componente no `web`, com Vitest e React Testing Library** (LLD, seção 1;
   `.claude/rules/nextjs.md`, "Testes"). Cobre os schemas Zod das Server Actions (nome em branco e
   longo, tipo não escolhido, mensagem vazia e longa), a tradução dos erros novos da API e os
   estados do formulário de criar canal e do campo de mensagem, buscados pelo papel e pelo nome
   acessível. Prior art: os testes do `web` da F1-01.
3. **E2E de navegador com Playwright**, no serviço `e2e` (`./scripts/e2e.sh`). Só os dois fluxos que
   só o navegador prova: criar um canal privado, convidar um segundo membro e ver o canal aparecer
   para ele e não para um terceiro; e navegar a lista de conversas e enviar uma mensagem usando só
   o teclado, com a conferência do axe. Prior art: o Playwright da F1-01.

**Conferências à mão, no PR**

- Nota 100 de Acessibilidade no Lighthouse nas telas novas.
- Validação visual de cada frame novo, nos dois temas, em 1440 × 900 (design system, "Validação
  visual").

## Fora do escopo

- Tempo real, aviso de "digitando", histórico paginado e contagem de não lidas e de menções: F1-04.
- Menção, citação, copiar texto, editar e apagar mensagens: F1-05.
- Busca de pessoas, @usuário e perfil: F1-03.
- Notificações e a tela Atividade: F1-06.
- Entrar e sair de canais e remover membros: F2-04 e F2-03.
- Renomear, arquivar e apagar canais; converter canal público em privado.
- Conversa direta com mais de duas pessoas.
- Agentes nas conversas: F1-08 em diante.
- Como o WebSocket confere a participação: é da FD-03, que reusa o serviço de participação.
- Remover a conta de um membro.

## Notas

- Decisões desta spec registradas no LLD: conversas numa tabela com tipo (seção "Dados"); serviço
  único de participação e resposta igual à de conversa inexistente (seção "Segurança"); 50
  mensagens por leitura, nome do canal de 1 a 80 e mensagem de até 4.000 caracteres (seção
  "Valores e configuração"). A paginação do histórico continua em "Questões em aberto", para a
  F1-04. Nenhuma passa nos três testes do ADR, e por isso não há ADR novo.
- Os "A definir" do PRD ficam resolvidos assim: unicidade do nome sem diferenciar maiúsculas e
  minúsculas e ignorando espaços nas pontas, 1 a 80 caracteres, qualquer membro de um canal privado
  convida, o convidado vê todo o histórico, conversa direta consigo mesmo é recusada, e a lista
  simples de membros para a conversa direta entra nesta entrega. O PRD é atualizado pelo mesmo PR.
- A ordem sugerida: frames no Figma; migração e tabelas; serviço de participação; conversas e
  convite; mensagens; snapshot OpenAPI; `web` (acesso à API, Server Actions); telas e componentes;
  testes de navegador.
