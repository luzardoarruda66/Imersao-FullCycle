# Spec: F1-03 Pessoas e perfis

Plano de implementação da F1-03 do roadmap (`docs/roadmap.md`, Fase 1). O quê e para quem está no
[PRD](prd.md); as regras e os mecanismos, no LLD (`docs/lld.md`), seções "Dados", "Interfaces",
"Estados e regras" (6.2, "Operação"), "Cliente" e "Valores e configuração". Esta spec diz o que
construir e em que ordem, e aponta para essas seções em vez de repetir as regras.

## Problema

A lista de membros da F1-02 mostra só o nome. Com o workspace crescendo, achar a pessoa certa e saber
quem ela é trava a abertura de uma conversa direta. E a Menção (F1-05) e a Delegação (F1-10) precisam
identificar membros por um nome que não se repete, que a conta de hoje (e-mail, senha e nome) não tem.

## Solução

O membro abre, na lateral, a busca de pessoas, digita parte de um nome ou de um @usuário e escolhe um
resultado: abre a conversa direta com a pessoa ou o Perfil dela. O Perfil mostra nome, @usuário,
cargo, telefone e status de qualquer membro. Cada membro passa a ter um @usuário único, que a operação
define ao criar a conta e que as contas existentes recebem numa migração.

Sem presença e sem edição do Perfil nesta entrega: cargo, telefone e status existem no banco, mas só a
F1-07 os preenche, então aparecem como "Não informado".

## Histórias de usuário

**Busca**

1. Como membro, quero abrir a busca de pessoas pela lateral, na seção "Conversas diretas", para
   encontrar alguém sem rolar a lista.
2. Como membro, quero buscar por parte do nome, para achar a pessoa sem saber o nome inteiro.
3. Como membro, quero buscar por parte do @usuário, para achar a pessoa pelo identificador que
   vou usar nas menções.
4. Como membro, quero que a busca ignore maiúsculas, minúsculas e acentos (`joao` acha `João`), para
   não me preocupar com a grafia.
5. Como membro, quero que `@maria` e `maria` devolvam os mesmos membros, para digitar o @usuário
   como ele aparece nas menções.
6. Como membro, quero ver nome e @usuário em cada resultado, para distinguir `joao.silva` de
   `joao_silva`.
7. Como membro, quero os resultados em ordem alfabética de nome, para achar um nome sem procurar.
8. Como membro, quero ver até 20 resultados, para que o diálogo não vire uma lista longa; quem não
   acha refina o termo.
9. Como membro, quero ver os primeiros membros em ordem alfabética quando a busca está vazia, para
   abrir uma conversa direta sem digitar, como na lista da F1-02.
10. Como membro, quero não aparecer nos meus próprios resultados, para não abrir uma conversa
    comigo mesmo.
11. Como membro, quero ver uma mensagem clara quando nada casa com o que digitei, para saber que
    a busca funcionou e não há ninguém.
12. Como membro, quero ver um estado de carregamento e, se a leitura falhar, uma mensagem de erro
    com "Tentar de novo", para saber o que houve sem perder o termo digitado.
13. Como membro, quero buscar, navegar pelos resultados e escolher usando só o teclado, para não
    depender do mouse.
14. Como membro, quero que a busca e o Perfil sigam o tema claro ou escuro do design system, para ler
    bem em qualquer tema.

**Abrir conversa direta**

15. Como membro, quero escolher um resultado (Enter ou clique) e cair na conversa direta com a
    pessoa, para começar a falar.
16. Como membro, quero que escolher quem já tem conversa direta comigo leve à existente, sem
    criar outra (F1-02).
17. Como membro, quero ver um erro e manter o diálogo aberto quando a conversa direta não abre, para
    tentar de novo.
18. Como membro, quero que a busca substitua o seletor de membros da F1-02 para a conversa direta,
    para ter um caminho só.

**Perfil**

19. Como membro, quero abrir o Perfil de um resultado da busca, por um botão "Ver perfil" ao lado do
    nome, para saber quem é a pessoa antes de falar com ela.
20. Como membro, quero ver no Perfil nome, @usuário, cargo, telefone e status, para conhecer a
    pessoa.
21. Como membro, quero que um campo não preenchido apareça como "Não informado", para não ver um
    espaço vazio nem texto técnico.
22. Como membro, quero abrir a conversa direta a partir do Perfil, para falar com a pessoa na hora.
23. Como membro, quero ver o meu próprio Perfil igual ao dos outros, para saber o que os colegas
    veem de mim.
24. Como membro, quero que o meu Perfil não ofereça abrir conversa direta comigo, para não cair
    numa ação que a F1-02 recusa.
25. Como membro, quero ver todos os Perfis, sem restrição de visibilidade, para conhecer qualquer
    colega.
26. Como membro, quero que o Perfil nunca mostre e-mail, papel de administrador nem permissão de
    dados, para que só o que é público do Perfil apareça (glossário, "Perfil").
27. Como membro, quero ver a tela de "não encontrado", com caminho de volta, quando o endereço do
    Perfil não leva a ninguém ou não é um identificador válido, para voltar ao chat.
28. Como membro, quero que o endereço do Perfil use o id, para o link continuar valendo se a
    operação trocar o @usuário.

**@usuário e operação**

29. Como operação, quero informar o @usuário ao criar a conta, para que todo membro tenha um.
30. Como operação, quero que o @usuário seja recusado quando já existe, sem diferenciar maiúsculas
    e minúsculas, para que dois membros nunca tenham o mesmo.
31. Como operação, quero que o @usuário fora do formato (3 a 30 caracteres: minúsculas, números,
    `.`, `-` e `_`) seja recusado com mensagem clara, para corrigir na hora.
32. Como operação, quero informar o @usuário com ou sem `@` inicial, para não me preocupar com a
    forma de digitar.
33. Como operação, quero trocar o @usuário de uma conta por um subcomando, para corrigir um erro de
    cadastro.
34. Como operação, quero que o comando recuse a conta que não existe, com mensagem clara, ao
    trocar o @usuário.
35. Como operação, quero que as contas existentes recebam um @usuário na migração, sem apagar dados
    nem quebrar ninguém, para ligar a F1-03 num banco que já tem membros.
36. Como membro com conta antiga, quero que o meu @usuário derive do início do meu e-mail e que uma
    colisão ganhe um sufixo numérico, para ter um identificador legível e único.

**Acesso e erros**

37. Como membro sem sessão, quero que a busca e o Perfil recusem os dados e me levem a entrar, para
    que nada apareça sem sessão (F1-01).
38. Como membro, quero ver a porta "Erro de sessão" quando a API cai, e não a tela de entrar, como
    já acontece (F1-01).
39. Como membro, quero que a API trate `%` e `_` no termo de busca como texto comum, para que a
    busca por `50%` não case com todo mundo.
40. Como membro, quero receber o erro de validação no formato único de erro quando a requisição
    vem malformada, para uma resposta previsível.

## Decisões de implementação

**Arquivo de design.** O Figma do projeto é o `GXeHfkmxrSH9mGMHTweQSP` (`docs/design-system.md`).
Os frames desta entrega estão na seção `F1-03 Pessoas e perfis` (`2071:82454`) da página Telas, nos
temas claro e escuro, e são o que o código implementa pelo fluxo "Do Figma para o código" do design
system. Cada tela tem dois frames: o claro, sem sufixo, e o escuro, com o sufixo `(escuro)`. O tema vem
do modo `Semantic` da variable, definido no próprio frame (`Light` ou `Dark`): a página Telas tem o
modo `Dark` por padrão, então um frame sem o modo explícito aparece escuro.

| Tela | Frame (claro) | Node-id claro | Node-id escuro |
| --- | --- | --- | --- |
| Buscar pessoas | `Pessoas / Buscar / Busca vazia` | `2071:82455` | `2071:82491` |
| Buscar pessoas | `Pessoas / Buscar / Com resultados` | `2071:82527` | `2071:82563` |
| Buscar pessoas | `Pessoas / Buscar / Sem resultado` | `2071:82599` | `2071:82635` |
| Buscar pessoas | `Pessoas / Buscar / Carregando` | `2071:82671` | `2071:82707` |
| Buscar pessoas | `Pessoas / Buscar / Erro ao carregar` | `2071:82743` | `2071:82779` |
| Buscar pessoas | `Pessoas / Buscar / Abrindo a conversa` | `2071:82815` | `2071:82851` |
| Buscar pessoas | `Pessoas / Buscar / Falha ao abrir` | `2071:82887` | `2071:82923` |
| Perfil | `Pessoas / Perfil / Completo` | `2075:87238` | `2075:87495` |
| Perfil | `Pessoas / Perfil / Campos não informados` | `2075:87748` | `2075:88001` |
| Perfil | `Pessoas / Perfil / Próprio perfil` | `2075:88254` | `2075:88501` |
| Perfil | `Pessoas / Perfil / Não encontrado` | `2075:88748` | `2075:89007` |

Os frames da busca partem do seletor "Escolher membro" da F1-02 (`Canais / Conversa direta / Escolher
membro`), que o diálogo de busca substitui, e os do Perfil partem do mesmo shell (Rail e Sidebar), sem
conversa ativa na lateral. Nenhum componente novo: tudo é instância de `PersonRow`, `Input`, `Button`,
`EmptyState`, `Skeleton`, `Spinner` e `UserAvatar`. O que é específico desta entrega:

- **Diálogo de busca:** título "Nova conversa" e descrição "Busque por nome ou @usuário para conversar
  em particular.". O campo de busca (`Input` com ícone) abre com o foco. Cada resultado é um `PersonRow`
  com nome e `@usuário` (sem cargo e sem presença) e um botão `Button` ghost `sm` "Ver perfil" à
  direita. A linha ativa pelo teclado usa o fundo `surface-subtle`.
- **Sem resultado e erro:** `EmptyState` compacto, com a mensagem "Nenhum membro com “…” no nome ou no
  @usuário." e, no erro, o botão "Tentar de novo", mantendo o termo digitado no campo.
- **Carregando:** três linhas de `Skeleton`. **Abrindo a conversa:** a linha escolhida troca o botão
  por um `Spinner`, e as outras ficam com `opacity-50` (estado desabilitado do design system).
- **Falha ao abrir:** texto de erro em linha dentro do diálogo, o mesmo padrão da F1-02, com o
  diálogo aberto.
- **Perfil:** página com cabeçalho "Perfil" e, no corpo, `UserAvatar` `xl`, nome, `@usuário`, e os
  campos Cargo, Telefone e Status, cada um com rótulo e valor, ou "Não informado" em `fg-muted` (o `fg-subtle` não chega ao contraste de 4,5:1). O
  botão `Button` secondary `md` "Enviar mensagem" aparece nos Perfis de outras pessoas e some no
  próprio Perfil. Sem presença, sem e-mail e sem hora local (diferente do `ProfilePanel`, que fica
  para a F1-07). O estado "Não encontrado" usa `EmptyState` com o botão "Voltar ao início".

**Modelo de dados (Banco do chat)**

- A tabela de pessoas ganha `username`, `job_title`, `phone` e `status_text` (LLD, "Dados", linha
  "Pessoas"). `username` é obrigatório e único; os outros três são opcionais.
- `username` é gravado em minúsculas e aparado, o que dá a unicidade sem diferenciar maiúsculas por um
  índice único comum. A condição de corrida entre dois cadastros com o mesmo @usuário termina no
  índice, como a do e-mail (LLD, "Concorrência e idempotência"). O formato está em "Valores e
  configuração" (`formato do @usuário`) e é conferido por uma função só, como a regra da senha, usada
  pelo comando e pela migração de teste.
- **Migração nova do TypeORM**, com `synchronize` desligado (ADR 0018): cria a extensão `unaccent`,
  acrescenta as colunas, preenche o `username` das contas existentes e só então o torna obrigatório
  e único. O preenchimento deriva a parte do e-mail antes do `@`, em minúsculas, troca por `_` o que
  não pertence ao formato, completa com `_` até 3 caracteres, trunca em 30 e, se colidir, acrescenta
  `-2`, `-3` e assim por diante, ainda dentro dos 30 caracteres. A migração tem `down`.
- A imagem do Postgres do Compose precisa trazer a extensão `unaccent` (contrib); confirmar ao
  implementar. Se a extensão não puder ser criada no ambiente, a busca perde a sensibilidade a
  acentos, o que contraria a história 4 e deve ser resolvido na imagem, e não no código.
- Nenhuma tabela nova e nenhum índice de busca: a busca varre as pessoas, o que sustenta o p95 do PRD
  na ordem de grandeza de 500 membros.

**Módulos da API do chat**

- **Pessoas (módulo novo de leitura):** busca e devolve o Perfil. A busca recebe o termo, remove o `@`
  inicial e as pontas, escapa `%`, `_` e a barra, e compara `unaccent` em minúsculas com parte do nome
  ou do @usuário. Exclui o membro da sessão, ordena por nome e limita em `resultados da busca de
  pessoas`. Termo vazio devolve os primeiros membros pela mesma ordem e limite. O módulo é só de
  leitura e nunca expõe e-mail nem papéis; os campos do Perfil são o que o snapshot declara.
- **Serviço de contas (`PeopleService`):** `create` passa a receber o @usuário e a tratar o conflito
  do índice dele como o do e-mail, com um erro próprio; nova operação troca o @usuário. A normalização
  (aparar, minúsculas, `@` inicial opcional) vive junto da regra do formato.
- **Rotas, com sessão** (nomes, campos e códigos de erro no snapshot OpenAPI; LLD, "Interfaces"):
  - `GET /v1/pessoas`: a busca, com o parâmetro `busca`.
  - `GET /v1/pessoas/:id`: o Perfil.
- **Erros:** o corpo único do LLD, "Erros". Código novo: `pessoa_inexistente` (404), também para o id
  que não é um UUID. Os demais reusam `sessao_invalida` (401) e `dados_invalidos` (400).
- **A lista de membros da F1-02** (`GET /v1/membros`) continua servindo o diálogo Convidar. A conversa
  direta passa a abrir pela busca, e a rota de abrir (`POST /v1/conversas/diretas`) não muda.
- **Comando `contas`** (LLD, 6.2, "Operação"): `criar <email> <usuario> <nome>` e o subcomando novo
  `definir-usuario <email> <usuario>`. As mensagens de erro dizem se o @usuário está em uso ou fora do
  formato. O uso e os exemplos do `AGENTS.md` da `chat-api` mudam junto.
- **Snapshot OpenAPI:** atualizado com as rotas e o código de erro novos; a conferência da CI (FD-08)
  o exige.

**Módulos do `web`**

- **Acesso à API do chat:** as funções de busca e de Perfil na camada `server-only`, com a tradução do
  erro novo em mensagem de tela.
- **Busca:** o diálogo é um componente de cliente que lê por `GET /api/pessoas`, uma rota do BFF que
  repassa o cookie à API do chat, com SWR (LLD, "Cliente"). Cada digitação cancela a leitura
  anterior. O termo e o resultado escolhido ficam no estado do diálogo.
- **Abrir conversa direta:** uma Server Action chama `POST /v1/conversas/diretas` e redireciona para a
  conversa, a mesma da F1-02, agora chamada pelo diálogo e pelo Perfil (ADR 0024). Valida o id com Zod
  antes de chamar a API.
- **Perfil:** página Server Component em `/pessoas/[id]`. Id sem resultado vira a tela de "não
  encontrado" do Next. O botão de conversa direta fica oculto no Perfil do próprio membro, que a
  página reconhece pelo membro da sessão.
- **Casca:** a seção "Conversas diretas" da lateral ganha o botão que abre o diálogo, no lugar do
  seletor da F1-02. O LLD passa as duas telas a `planejada` (feito nesta spec) e a `existe` quando a
  entrega chegar.
- **Componentes:** o campo de busca, o item de resultado e o cartão do Perfil, pelo fluxo do design
  system e com o que a F1-02 já criou (item de lista, diálogo).

**Ambiente.** Nada novo no Compose além da extensão do Postgres. A migração roda no contêiner
`chat-api`, como as outras.

## Decisões de teste

Um bom teste prova comportamento visível de fora: a resposta HTTP, o que a tela mostra, a saída do
comando. Nada de testar a implementação (consultas geradas, chamadas internas).

**Pontos de teste**

1. **E2E HTTP da API do chat** (o ponto principal): Supertest contra a app Nest de verdade e um
   Postgres de verdade, no banco `chat_test`. Cobre:
   - busca por parte do nome, por parte do @usuário, com `@` inicial, com acento e com outra caixa,
     devolvendo os mesmos membros;
   - ordem por nome, limite de 20 com um conjunto de mais de 20, e termo vazio devolvendo os primeiros
     em ordem;
   - o membro da sessão ausente dos próprios resultados;
   - termo com `%` e `_` tratado como texto, sem casar com todo mundo;
   - sem resultado: lista vazia, status de sucesso;
   - Perfil: campos preenchidos e campos não preenchidos como ausentes; nenhum e-mail, papel nem
     permissão no corpo; Perfil do próprio membro; id inexistente e id que não é UUID com o mesmo
     erro `pessoa_inexistente`;
   - as duas rotas sem cookie, com cookie inválido e depois de encerrar as sessões, recusando;
   - corpo de erro único, inclusive para parâmetro malformado;
   - a migração: num banco com contas antigas, cada uma recebe um @usuário válido; e-mails que
     derivam o mesmo @usuário recebem sufixos distintos; e-mail com caracteres fora do formato e
     parte local curta resultam em @usuário válido.
   Prior art: o E2E HTTP da F1-01 e o da F1-02 (`docs/f1-01-entrar/spec.md` e
   `docs/f1-02-canais-e-conversas-diretas/spec.md`, "Decisões de teste") e os testes do comando
   `contas` da `chat-api`.
2. **Comando `contas`**, no mesmo E2E da API do chat, chamando o comando como a operação chama:
   criar com @usuário válido; com `@` inicial; repetido com outra caixa; fora do formato; sem
   @usuário; `definir-usuario` para uma conta que existe e para uma que não existe, e para um
   @usuário em uso.
3. **Unitário e de componente no `web`, com Vitest e React Testing Library** (LLD, seção 1;
   `.claude/rules/nextjs.md`, "Testes"). Cobre o schema Zod da Server Action, a tradução do erro novo
   e os estados do diálogo de busca (vazio, com resultados, sem resultado, carregando, erro, abrindo) e
   do Perfil (completo, "Não informado", próprio Perfil sem o botão), buscados pelo papel e pelo nome
   acessível. Prior art: os testes do `web` da F1-01 e da F1-02.
4. **E2E de navegador com Playwright**, no serviço `e2e` (`./scripts/e2e.sh`). Um único fluxo, só
   pelo teclado: abrir a busca, digitar parte de um @usuário, abrir a conversa direta com o resultado
   e, em outra passagem, abrir o Perfil e voltar, com a conferência do axe. Prior art: o Playwright
   da F1-01 e da F1-02.

**Conferências à mão, no PR**

- Nota 100 de Acessibilidade no Lighthouse nas telas novas.
- Validação visual de cada frame novo, nos dois temas, em 1440 × 900 (design system, "Validação
  visual").
- Tempo da busca: p95 ≤ 200 ms contra 500 membros carregados no banco local.

## Fora do escopo

- Editar o próprio Perfil e escolher o tema: F1-07.
- Presença no Perfil e na busca: F1-07.
- Mencionar com `@` dentro de uma mensagem: F1-05. A F1-03 só cria o identificador.
- Busca de mensagens e de conversas: F2-05.
- Foto de perfil e busca por cargo, telefone ou status.
- Troca do @usuário pelo próprio membro.
- Agentes na busca: F1-08.
- Link para o Perfil no cabeçalho da conversa direta e no menu do membro: candidatos à F1-07.
- Celular e tablet.

## Notas

- Decisões desta spec registradas no LLD: @usuário, colunas do Perfil e preenchimento das contas
  existentes (seção "Dados"); rotas de busca e de Perfil (seção "Interfaces"); alteração do comando
  `contas` (seção "Estados e regras", 6.2); telas (seção "Cliente"); formato do @usuário e limite de
  resultados (seção "Valores e configuração"). Nenhuma passa nos três testes do ADR, então não há
  ADR novo. O `GLOSSARY.md` ganha o termo @usuário.
- Pontos que o PRD deixou abertos e esta spec resolve: o próprio Perfil não oferece conversa direta
  comigo mesmo; a busca vazia devolve os primeiros membros em ordem alfabética; o Perfil é alcançado
  pelo botão "Ver perfil" de cada resultado, e o próprio Perfil só pelo endereço, até a F1-07.
- A F1-03 depende da F1-02 (Especificada, ainda não concluída): a conversa direta, o diálogo da
  lateral e a rota de abrir conversa vêm de lá. Implementar depois da F1-02.
- A ordem sugerida: frames no Figma; migração, extensão e colunas; formato do @usuário e serviço de
  contas; comando `contas`; módulo de pessoas e rotas; snapshot OpenAPI; `web` (acesso à API, rota
  do BFF, Server Action); diálogo e página do Perfil; testes de navegador.
