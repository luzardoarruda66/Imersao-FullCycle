# Spec: F1-05 Menção, citação e edição

Plano de implementação da F1-05 do roadmap (`docs/roadmap.md`, Fase 1). O quê e para quem está no
[PRD](prd.md); as regras e os mecanismos, no LLD (`docs/lld.md`), seções "Concorrência e
idempotência", "Transações", "Dados", "Interfaces", "Cliente" e "Valores e configuração". Esta spec
diz o que construir e em que ordem, e aponta para essas seções em vez de repetir as regras.

## Problema

Na conversa, o membro não consegue chamar a atenção de uma pessoa, responder a uma mensagem sem
perder o contexto, copiar o texto de uma mensagem nem corrigir ou retirar o que escreveu. Os
contadores de menções que a F1-04 entrega ficam zerados, e a F1-06 (notificações) e a F1-09
(agentes, que são chamados por menção) não têm em que se apoiar.

## Solução

A conversa ganha quatro ações e uma regra de tempo:

- **Mencionar:** digitar `@` no campo de mensagem abre a lista dos participantes da conversa; a
  mensagem enviada mostra a menção destacada e soma 1 ao contador de menções de cada pessoa
  mencionada;
- **Citar:** a mensagem enviada leva o trecho e o autor de outra mensagem da mesma conversa;
- **Copiar texto:** põe o texto da mensagem na área de transferência;
- **Editar e apagar:** só o autor, até 4 horas depois do envio. A mensagem editada ganha
  "(editada)"; a apagada vira "Mensagem apagada". As duas mudanças chegam a quem está com a conversa
  aberta em até 1 s (p95) e acertam os contadores de menções e de não lidas.

A API resolve as menções a partir do texto (o cliente não manda lista de menções), grava tudo na
mesma transação da mensagem (ADR 0021) e publica depois do commit (ADR 0025).

## Histórias de usuário

**Mencionar**

1. Como membro, quero digitar `@` e ver a lista dos participantes da conversa, para escolher quem
   mencionar.
2. Como membro, quero filtrar a lista pelo que digito depois do `@`, por nome ou @usuário, para
   achar a pessoa rápido.
3. Como membro, quero escolher a pessoa por teclado (setas, Enter e Esc) e por mouse, para não
   largar o teclado.
4. Como membro, quero que a lista nunca mostre quem não participa de canal privado ou de conversa
   direta, para que a menção não revele nem alcance quem não está lá.
5. Como membro, quero ver a menção destacada na mensagem enviada, para distinguir de texto comum.
6. Como membro mencionado, quero ver o contador de menções da conversa subir em 1 por mensagem, mesmo
   que o autor me cite duas vezes no texto, para a contagem refletir mensagens e não ocorrências.
7. Como membro mencionado, quero ver o contador subir na hora, em todas as minhas abas, para saber
   que falaram comigo.
8. Como membro, quero que mencionar a mim mesmo não some contador, para não me avisar do que eu
   mesmo escrevi.
9. Como membro, quero que um `@` seguido de algo que não é @usuário de um participante fique como
   texto comum, sem erro, para escrever e-mails e termos livremente.
10. Como membro, quero que a menção só valha para participantes da conversa no momento do envio, para
    que ninguém seja avisado de uma conversa que não vê.
11. Como membro, quero que a menção funcione também na conversa direta, para chamar a atenção da
    outra pessoa.
12. Como membro, quero que o reenvio da mesma mensagem (mesmo identificador de envio) não some
    contador de novo, para a rede ruim não inflar as menções.
13. Como pessoa que desenvolve, quero que a menção a agente fique fora desta entrega, para a F1-09
    somar sem retrabalho.

**Citar**

14. Como membro, quero escolher **Citar** numa mensagem e ver o trecho dela na caixa antes de enviar,
    para ter certeza do que estou respondendo.
15. Como membro, quero cancelar a citação antes de enviar, para mandar uma mensagem comum.
16. Como membro, quero ver, na mensagem enviada, o autor e o trecho da original acima do texto, para
    manter o contexto.
17. Como membro, quero clicar na citação e ir até a original na conversa, ou ser avisado de que ela
    está fora das mensagens carregadas e carregá-la, para acompanhar o assunto.
18. Como membro, quero que a citação de uma mensagem editada mostre o texto atual, para não ler uma
    versão velha.
19. Como membro, quero que a citação de uma mensagem apagada mostre "Mensagem apagada" no lugar do
    trecho, para o conteúdo retirado não continuar à mostra.
20. Como membro, quero que o trecho seja cortado em 140 caracteres com reticências, para a citação não
    ocupar a tela.
21. Como membro, quero que só se possa citar mensagem da própria conversa e que ainda não foi
    apagada, para a citação nunca vazar outra conversa.
22. Como membro, quero que citar não crie thread, para a conversa continuar numa fila só.
23. Como membro, quero que a citação funcione por teclado, para não depender do mouse.

**Copiar texto**

24. Como membro, quero escolher **Copiar texto** e ter o texto da mensagem na área de transferência,
    para reutilizá-lo.
25. Como membro, quero ver um aviso na tela quando o texto foi copiado e outro quando o navegador
    recusou, para saber se funcionou.
26. Como membro, quero que a ação não exista em mensagem apagada, para não copiar o que foi retirado.
27. Como membro, quero que o texto copiado seja o texto puro (com `@usuário`), sem marcação visual.

**Editar**

28. Como autor, quero escolher **Editar** na minha mensagem e alterar o texto no próprio lugar, para
    corrigir sem apagar e reenviar.
29. Como autor, quero confirmar com Enter e cancelar com Esc, para editar só pelo teclado.
30. Como autor, quero que **Editar** apareça só até 4 horas depois do envio, para saber que ainda
    posso.
31. Como autor, quero que o servidor recuse a edição depois das 4 horas mesmo que a tela esteja
    aberta há mais tempo, para a regra não depender da tela.
32. Como membro, quero ver "(editada)" na mensagem alterada, para saber que o texto mudou.
33. Como membro, quero que a mensagem editada fique na mesma posição da conversa, para não perder o
    fio.
34. Como autor, quero que não seja possível editar para texto vazio ou maior que 4.000 caracteres,
    para a mensagem continuar válida; para retirar, existe **Apagar**.
35. Como autor, quero que editar para o mesmo texto não mude nada, não marque "(editada)" e não
    publique evento, para não gerar ruído.
36. Como membro, quero que **Editar** não apareça em mensagem de outra pessoa e que o servidor a
    recuse, para ninguém alterar o que não escreveu.
37. Como autor, quero que a edição que acrescenta `@pessoa` soma 1 ao contador de menções dessa
    pessoa, para ela ficar sabendo.
38. Como membro já mencionado, quero não ser contado de novo quando a mensagem é editada, para a
    contagem não inflar.
39. Como membro, quero que a edição que remove `@pessoa` desconte o contador dessa pessoa, se ela
    ainda não leu a mensagem, para ela não ver uma menção que deixou de existir.
40. Como membro mencionado que já leu a mensagem, quero que a menção acrescentada depois não mexa no
    meu contador, que só conta o que veio depois da minha leitura, para ele continuar coerente com a
    regra da leitura.

**Apagar**

41. Como autor, quero escolher **Apagar** e confirmar, para retirar a mensagem sem apagar por
    engano.
42. Como autor, quero que **Apagar** apareça só até 4 horas depois do envio, e que o servidor recuse
    depois disso.
43. Como membro, quero ver "Mensagem apagada" no lugar da mensagem para todos, sem o texto, para o
    conteúdo retirado não ficar à mostra.
44. Como membro, quero que a mensagem apagada continue na mesma posição, para a conversa não
    "pular".
45. Como membro que ainda não leu a mensagem apagada, quero que o contador de não lidas desça em 1, para
    não ficar com uma não lida que não existe.
46. Como membro mencionado que ainda não leu a mensagem apagada, quero que o contador de menções desça em
    1, para não ficar com uma menção que não existe.
47. Como membro que já leu a mensagem apagada, quero que meus contadores não mudem, para não ficarem
    abaixo do real.
48. Como membro, quero que os contadores nunca fiquem negativos, mesmo com apagar e ler ao mesmo
    tempo, para não ver número impossível.
49. Como autor, quero que apagar duas vezes seja inofensivo (a segunda não muda nada e não publica
    evento), para o duplo clique não dar erro.
50. Como autor, quero que editar uma mensagem já apagada seja recusado, para não ressuscitá-la.
51. Como membro, quero que, ao apagar, o texto saia do banco e das respostas da API (HLD, seção 7:
    "apaga o conteúdo de vez"), para que nem a reposição depois de queda o devolva.
52. Como membro, quero que as mensagens que citavam a apagada passem a mostrar "Mensagem apagada" na
    citação, para o texto não vazar pela citação.

**Tempo real**

53. Como membro com a conversa aberta, quero ver a edição e a exclusão em até 1 s (p95), sem recarregar
    (critério do FD-03).
54. Como membro com a conversa aberta em duas abas, quero ver a mudança nas duas.
55. Como membro que ficou desconectado, quero receber a edição ou a exclusão na reconexão (FD-03), ou
    ver a conversa recarregada pelo histórico, para não ver texto velho.
56. Como membro, quero que uma edição ou exclusão que chega duas vezes (resposta e evento) não
    estrague a tela, para a mudança ser idempotente.
57. Como membro, quero que um evento de edição ou exclusão para uma mensagem que não está carregada
    não faça nada, para a tela não gastar à toa.
58. Como membro, quero que quem não participa de canal privado ou conversa direta nunca receba a
    mensagem editada, a exclusão nem a menção.
59. Como membro, quero que as ações **Editar** e **Apagar** funcionem por teclado, para o produto
    cumprir o requisito de Acessibilidade do brief.
60. Como membro, quero que o menu de ações da mensagem seja alcançável por teclado e anuncie as ações
    para leitor de tela.

**Para quem desenvolve**

61. Como pessoa que desenvolve, quero um só ponto que calcula as menções do texto, para o envio e a
    edição não divergirem.
62. Como pessoa que desenvolve, quero que a F1-06 leia as menções gravadas para criar a notificação,
    sem reanalisar o texto.
63. Como pessoa que desenvolve, quero que o prazo de 4 horas seja uma constante única, usada pela
    API e pelo `web`, para mudar num lugar só.
64. Como pessoa que desenvolve, quero que a F1-09 reuse a mesma resolução de menção para chamar o
    agente, para não haver duas.

## Decisões de implementação

As regras e os mecanismos, com o porquê, ficam no LLD, nas seções citadas; abaixo está o que
construir.

**Arquivo de design.** O Figma do projeto é o `GXeHfkmxrSH9mGMHTweQSP` (`docs/design-system.md`).
Os frames desta entrega estão na seção `F1-05 Menção, citação e edição` (`2084:94529`) da página
Telas, nos temas claro e escuro, e são o que o código implementa pelo fluxo "Do Figma para o código"
do design system. Cada estado tem dois frames: o claro, sem sufixo, e o escuro, com o sufixo
`(escuro)`. O tema vem do modo `Semantic` da variable, definido no próprio frame (`Light` ou
`Dark`): a página Telas tem o modo `Dark` por padrão, então um frame sem o modo explícito aparece
escuro.

| Tela | Frame (claro) | Node-id claro | Node-id escuro |
| --- | --- | --- | --- |
| Campo de mensagem | `Mensagem / Campo / Lista de @` | `2084:94530` | `2084:94780` |
| Campo de mensagem | `Mensagem / Campo / Lista de @ sem resultado` | `2084:98784` | `2084:99031` |
| Campo de mensagem | `Mensagem / Campo / Citando` | `2084:95536` | `2084:95768` |
| Campo de mensagem | `Mensagem / Campo / Editando` | `2084:96000` | `2084:96236` |
| Campo de mensagem | `Mensagem / Campo / Editando com erro` | `2084:96472` | `2084:96820` |
| Mensagem | `Mensagem / Item / Menção` | `2084:99500` | `2084:99724` |
| Mensagem | `Mensagem / Item / Com citação` | `2084:99948` | `2084:100173` |
| Mensagem | `Mensagem / Item / Editada` | `2084:100398` | `2084:100730` |
| Mensagem | `Mensagem / Item / Apagada` | `2084:101029` | `2084:101328` |
| Mensagem | `Mensagem / Item / Citação apagada` | `2084:101627` | `2084:101962` |
| Menu de ações | `Mensagem / Ações / Minha no prazo` | `2084:103185` | `2084:103567` |
| Menu de ações | `Mensagem / Ações / Minha fora do prazo` | `2084:103949` | `2084:104325` |
| Menu de ações | `Mensagem / Ações / De outra pessoa` | `2084:104701` | `2084:105060` |
| Diálogo de apagar | `Mensagem / Apagar / Confirmação` | `2084:105419` | `2084:105652` |
| Aviso | `Mensagem / Aviso / Texto copiado` | `2084:105885` | `2084:106138` |
| Aviso | `Mensagem / Aviso / Falha ao copiar` | `2084:106391` | `2084:106634` |

Os frames partem do de referência "Uma pessoa digitando" da F1-04 (a casca sem agentes, sem
presença e sem Atividade), com as mensagens, o campo e as sobreposições copiados dos frames de
Conversa da F1-02 (`Conversa / Composer / ...`, `Conversa / Mensagem / ...` e
`Conversa / Sobreposições / ...`), sem o que é de agente. A F1-05 acrescenta o que a tabela diz e
nada mais: sem reações, sem thread, sem histórico de versões.

- "Lista de @ sem resultado" mostra "Nenhuma pessoa encontrada" na lista; "Item / Apagada" mostra
  "Mensagem apagada" em `fg-muted`, sem menu nem barra de ações.
- "Minha fora do prazo" é a mensagem do próprio autor, mas com o menu e a barra de uma mensagem de
  outra pessoa: sem Editar e sem Apagar. "Editando com erro" mostra a recusa por prazo
  ("O prazo de 4 horas para editar esta mensagem acabou.").
- **Rótulos:** o glossário diz Citação e a PRD diz **Citar**, então nos frames da F1-05 o item do
  menu é "Citar", o aviso sobre o campo é "Citando <nome>" e a citação de mensagem apagada diz
  "Mensagem apagada". Os componentes de referência (`MessageMenu`, `MessageComposer`, `ReplyQuote`)
  ainda trazem "Responder", "Respondendo a" e "Em resposta a uma mensagem apagada", e a "(editado)"
  da mensagem editada: o código implementa os rótulos dos frames, e o ajuste dos componentes fica
  para a tarefa do menu de ações (#75).

**Modelo de dados (Banco do chat)**

- **Mensagens** ganham: `edited_at` (vazio até a primeira edição), `quoted_message_id` (opcional,
  mensagem da mesma conversa) e
  `deleted_at` (a coluna já está prevista no LLD, "Dados"). Ao apagar, o texto é zerado (HLD, seção
  7).
- **Menções:** tabela com (mensagem, pessoa mencionada), chave única na dupla, linha removida com a
  mensagem ou com a pessoa. É a fonte do contador de menções e da notificação da F1-06.
- **Estado de leitura:** nada novo. `mencoes` passa a ser somado e recalculado, o que a F1-04 já
  deixou prevista (spec da F1-04, "Modelo de dados").
- Migração nova do TypeORM, com `synchronize` desligado (ADR 0018) e ids em UUID v7 (ADR 0022).

**API do chat: mensagens**

- **Menções no envio.** O módulo de mensagens extrai do texto os `@usuário` válidos (`formato do
  @usuário`), confere cada um contra os **participantes da conversa** pelo serviço de participação
  (que a F1-04 já estendeu com "quem participa") e ignora o que não casa. Uma função só faz essa
  extração, usada no envio e na edição (história 61). O autor nunca conta para si. Na mesma
  transação da mensagem: grava as menções e, para cada mencionado, soma 1 a `mencoes` junto com o
  `nao_lidas` que a F1-04 já soma (incremento no próprio `UPDATE`, sem ler antes).
- **Citação no envio.** O envio aceita `citacao_id`. A API confere que a mensagem citada é da mesma
  conversa e não foi apagada; do contrário, `dados_invalidos` (400). A resposta e o histórico trazem a
  citação como objeto: id, autor (id, nome e @usuário), trecho de até `tamanho do trecho da
  citação` caracteres e `apagada`. O trecho é montado na leitura, a partir do texto atual da citada:
  edição aparece e exclusão esconde o texto sem reescrever as mensagens que citam.
- **Formato da mensagem.** Toda mensagem (envio, histórico e evento) passa a trazer `mencoes` (id e
  @usuário de cada pessoa mencionada, para o cliente destacar só as reais), `citacao`, `editada_em`
  e `apagada`. Mensagem apagada traz texto vazio e nenhuma menção.
- **Editar.** `PATCH /v1/conversas/:id/mensagens/:mensagemId` com o texto novo (aparado, de 1 a
  `tamanho da mensagem`). Pelo serviço de participação. Confere: a mensagem existe na conversa; é do
  autor; não foi apagada; e o relógio da API (o `Clock` injetável) está a até `prazo para editar e
  apagar` do `created_at`. Texto igual ao gravado: devolve a mensagem sem alterar nada nem publicar.
  Se muda: grava texto e `edited_at`, recalcula as menções do texto novo e, na mesma transação, ajusta
  `mencoes`: soma 1 a quem entrou e subtraiu 1 de quem saiu, **só para quem ainda não leu a
  mensagem** (a mensagem é posterior à posição de leitura da pessoa); quem já leu não tem o contador
  alterado, porque `mencoes` é, por definição, a contagem das menções depois da leitura (LLD,
  "Concorrência e idempotência"). Quem já era mencionado e continua sendo não muda. A atualização é
  condicional em `deleted_at` vazio, para uma exclusão simultânea vencer a edição sem erro de
  estado.
- **Apagar.** `DELETE /v1/conversas/:id/mensagens/:mensagemId`. Mesmas conferências da edição
  (existe, é do autor, prazo). Se já apagada: devolve sucesso sem alterar nem publicar (idempotente).
  Senão, na mesma transação: zera o texto, grava `deleted_at`, remove as menções e subtrai 1 de
  `nao_lidas` de cada participante, e de `mencoes` de cada mencionado, **que ainda não leu a
  mensagem**, nunca abaixo de zero (restrição do contador, ADR 0021). A atualização é condicional em
  `deleted_at` vazio, para duas exclusões simultâneas descontarem uma vez só.
- **Ler e apagar ao mesmo tempo.** A leitura recalcula `nao_lidas` e `mencoes` contando mensagens e
  menções que existem depois da posição (spec da F1-04); como a exclusão remove as menções e marca a
  mensagem, a leitura que roda depois já não a conta, e a exclusão que roda depois só desconta de
  quem ainda não leu. As duas travam a linha do contador, então não há contagem dupla nem negativa.
- **Rota de menção.** `GET /v1/conversas/:id/mencionaveis?busca=` devolve os participantes da
  conversa, menos quem pede, com id, nome e @usuário, ordenados por nome, no máximo `resultados da
  busca de pessoas`, com a mesma regra de busca da F1-03 (sem diferenciar maiúsculas e acentos, `@`
  inicial ignorado). Pelo serviço de participação: conversa alheia responde `conversa_inexistente`.
- **Eventos depois do commit** (ADR 0025), um por pessoa:
  - `mensagem_editada`, para cada participante, o autor inclusive: conversa e a mensagem completa no
    formato novo;
  - `mensagem_apagada`, para cada participante: conversa e id da mensagem;
  - `contagem_atualizada` (da F1-04), só para quem teve contador alterado, com as contagens novas.
  Os dois novos entram nos eventos de reconexão do Redis, como `mensagem_criada`, porque quem estava
  desconectado precisa deles; a regra por pessoa do ADR 0020 vale quando a marca "dados de negócio"
  existir. O `mensagem_criada` da F1-04 passa a levar o formato novo da mensagem.
- **Erros novos** (catálogo, `snake_case` em português): `mensagem_inexistente` (404, id que não é
  UUID, que não existe ou que é de outra conversa); `mensagem_de_outra_pessoa` (403); `prazo_encerrado`
  (422, com `details.prazo_segundos`); `mensagem_apagada` (422, editar mensagem apagada). Texto vazio
  ou grande demais e citação inválida: `dados_invalidos` (400), já no catálogo.
- **Snapshot OpenAPI** atualizado; a conferência da CI o exige.

**`chat-events` (pacote)**

- Os eventos `mensagem_editada` e `mensagem_apagada`, com schemas Zod e tipos. O schema da mensagem
  é um só e é reaproveitado por `mensagem_criada`, `mensagem_editada` e pelo histórico. O pacote
  continua dono do formato; a API confere antes de publicar e o `web` confere o que chega.

**`web`**

- **Acesso à API do chat:** editar e apagar são Server Actions (ADR 0024), com a entrada validada por
  Zod, na camada `server-only`, com a tradução de erro em mensagem de tela. A lista de menção vem de
  uma rota do BFF (`GET /api/conversas/:id/mencionaveis`), consumida com SWR, como a busca de
  pessoas da F1-03. O envio ganha `citacao_id`.
- **Cache e tempo real** (LLD, "Cliente", "Leituras e tempo real"): `mensagem_editada` e
  `mensagem_apagada` substituem a mensagem no cache pelo id, se a conversa está carregada, e são
  ignoradas se não está; repetidas, não mudam nada. As citações dentro de outras mensagens
  carregadas que apontam para a apagada passam a `apagada`. `contagem_atualizada` grava as contagens
  na lista, como na F1-04.
- **Campo de mensagem:** ao digitar `@` no começo ou depois de espaço, abre a lista (padrão de
  `combobox` com `aria-activedescendant`), que filtra a cada tecla com espera curta e fecha com Esc,
  espaço sem resultado ou perda de foco. Escolher insere `@usuário ` no texto. O campo mostra a
  citação escolhida, com botão de cancelar. Enviar leva o texto e o `citacao_id`.
- **Mensagem:** destaca só as menções que vêm em `mencoes` (um `@` que não está lá fica texto);
  mostra a citação acima do texto (clicável, rola até a original se carregada, ou carrega o
  histórico até ela com a mesma paginação da F1-04); mostra "(editada)" quando há `editada_em`; mostra
  "Mensagem apagada" quando `apagada`, sem menu.
- **Menu de ações:** aparece ao passar o mouse ou ao receber foco na mensagem, e por tecla no
  teclado. Itens: Citar, Copiar texto, e, para o autor dentro do prazo, Editar e Apagar. O prazo
  é conferido no cliente só para esconder a ação, com a constante única do pacote, e o servidor é
  quem recusa.
- **Copiar texto:** `navigator.clipboard.writeText` com o texto puro; aviso de sucesso ou de falha
  (sem permissão ou contexto inseguro) por região `aria-live` educada.
- **Editar no lugar:** a mensagem vira um campo com o texto atual; Enter confirma, Esc cancela; o
  botão fica desabilitado com texto vazio, igual ao atual ou acima do limite. Se o servidor recusa
  por prazo, o campo fecha e a tela mostra o aviso.
- **Apagar:** diálogo de confirmação (componente do design system) antes de chamar a Server Action.
- **Ações otimistas:** nenhuma. A tela espera a resposta e o evento; a F1-04 já deduplica por id.

**Ambiente.** Nada novo no Compose. Os testes de navegador usam duas sessões do mesmo `e2e`.

**Documentos que esta spec atualiza no mesmo PR**

- LLD: "Dados" (menções, colunas de mensagem), "Concorrência e idempotência" (menção no envio, na
  edição e na exclusão; leitura com menções), "Interfaces" (rotas, eventos, formato da mensagem e
  erros novos), "Cliente" (telas e comportamento), "Valores e configuração" (valores abaixo) e
  "Questões em aberto" (resolve "mensagem (exclusão com menções, notificações e contadores; edição
  que acrescenta menção)").
- HLD: seção 6.2 (edição e exclusão em tempo real) e a regra "Apagar uma mensagem" da seção 7, que
  passa a dizer que a exclusão também acerta os contadores.
- Roadmap: a F1-05 passa a Especificada, com o plano apontando para o PRD, para esta spec e suas
  issues.

**Valores de regra novos** (donos: LLD, "Valores e configuração")

| Nome | Valor |
| --- | --- |
| Prazo para editar e apagar | 4 horas depois do envio (PRD da F1-05) |
| Tamanho do trecho da citação | 140 caracteres |

**Ordem sugerida**

1. Frames no Figma.
2. Os eventos e o schema da mensagem no `chat-events`.
3. Migração: colunas de mensagem e tabela de menções.
4. Extração de menções e contadores no envio; formato novo da mensagem; citação.
5. Rota de menção (`mencionaveis`).
6. Editar, com o ajuste dos contadores e os eventos.
7. Apagar, com o ajuste dos contadores e os eventos.
8. Leitura recalculando `mencoes` pelas menções gravadas.
9. Snapshot OpenAPI.
10. `web`: acesso à API, cache e tratamento dos eventos.
11. Telas: campo com `@` e citação, mensagem, menu, edição no lugar, diálogo e avisos.
12. Testes de navegador e conferências à mão.

## Decisões de teste

Um bom teste prova comportamento visível de fora: o que a API devolve, o que um cliente Socket.IO
recebe, o que a tela mostra. Nada de testar a implementação (consultas geradas, estado interno do
gateway, chamadas ao SWR).

**Pontos de teste**

1. **E2E da `chat-api` com HTTP e um cliente Socket.IO de verdade** (o ponto principal), como o
   E2E da F1-04: app escutando de verdade, Postgres `chat_test`, o Redis do Compose e o relógio
   controlado. Prior art: `docs/f1-04-tempo-real-e-nao-lidas/spec.md` ("Decisões de teste"), o E2E
   do FD-03 e o de conversas da F1-02. Cobre:
   - menção no envio: mencionado recebe `mensagem_criada` com `mencoes` e a contagem de menções e
     de não lidas somadas; citado duas vezes soma 1; autor mencionando a si mesmo não soma;
     `@` de quem não participa fica como texto e não soma; em canal privado e em conversa direta,
     quem não participa nunca recebe nada; reenvio com o mesmo identificador não soma de novo;
   - citação: devolve o objeto com trecho de 140 caracteres; citada de outra conversa ou apagada
     recusa com `dados_invalidos`; depois de editar a citada a citação mostra o novo texto; depois
     de apagar a citada mostra `apagada` e nenhum texto;
   - edição: autor dentro do prazo muda o texto, marca `editada_em`, publica `mensagem_editada`
     para os participantes (inclusive duas abas do autor); outra pessoa recebe 403; com o relógio
     em 4 h + 1 s recusa `prazo_encerrado`, e em exatamente 4 h ainda aceita; texto igual não
     publica nem marca; vazio e acima de 4.000 caracteres recusa; mensagem apagada recusa;
   - contadores na edição: menção acrescentada soma ao novo; mantida não soma de novo; removida
     desconta de quem não leu e nada faz em quem leu; contador nunca negativo; cada mudança publica
     `contagem_atualizada` só para quem mudou;
   - exclusão: apaga o texto (a API e o banco já não o têm), publica `mensagem_apagada`, remove as
     menções e desconta `nao_lidas` e `mencoes` só de quem não leu; apagar duas vezes (em sequência e
     em paralelo) desconta uma vez; apagar depois de 4 h recusa; leitura e exclusão simultâneas não
     deixam contador negativo nem contam a apagada;
   - tempo real: `mensagem_editada` e `mensagem_apagada` entram na reposição depois de reconexão, em
     ordem, para quem participa, e nunca para quem não participa;
   - `mencionaveis`: só participantes, sem quem pede, filtrado sem acento e sem maiúscula, e
     conversa alheia responde como inexistente;
   - desempenho: mesma carga da F1-04, com p95 da resposta da edição e da exclusão até o evento
     recebido ≤ 1 s, escrito como teste (critério do FD-03);
   - todas as rotas novas sem cookie, com cookie inválido e depois de encerrar as sessões recusando,
     e o corpo de erro único.
2. **Vitest e React Testing Library no `web`**, com o socket falso do FD-03 (`.claude/rules/nextjs.md`,
   "Testes"): o tratamento de `mensagem_editada` e `mensagem_apagada` no cache (substitui pelo id,
   ignora conversa não carregada, repetido não muda, citações viram `apagada`); o destaque de
   menção (só as que vêm em `mencoes`); a lista de `@` (abre ao digitar, filtra, setas, Enter e Esc,
   fecha); a citação no campo (mostra, cancela, envia o `citacao_id`); o menu de ações (itens de
   autor dentro do prazo, fora do prazo, de outra pessoa, mensagem apagada sem menu); copiar (sucesso
   e falha do `clipboard`); a edição no lugar (Enter, Esc, botão desabilitado nos casos inválidos); o
   diálogo de apagar. Prior art: os testes do `web` da F1-04.
3. **E2E de navegador com Playwright** (`./scripts/e2e.sh`), só o que só o navegador prova, com dois
   contextos de dois membros: um menciona o outro e o contador dele sobe; um cita e o outro vê a
   citação e clica para ir à original; o autor edita e o outro vê "(editada)" sem recarregar; o autor
   apaga e o outro vê "Mensagem apagada" e o contador desce; o fluxo todo só com o teclado, com a
   conferência do axe. Prior art: o Playwright da F1-04.

**Conferências à mão, no PR**

- Uma queda real: o contêiner `chat-api` parado, uma edição e uma exclusão feitas pelo outro membro
  durante a queda e o contêiner religado; a conversa aparece atualizada sozinha.
- Nota 100 de Acessibilidade no Lighthouse nas telas novas.
- Validação visual de cada frame novo, nos dois temas, em 1440 × 900 (design system, "Validação
  visual").

## Fora do escopo

- Notificação na tela e do navegador, e a tela Atividade: F1-06. A F1-05 grava as menções e soma o
  contador; a notificação sai delas.
- Menção a agentes e o chamado ao agente: F1-09. `@canal` e `@todos`: fora do MVP.
- Thread: F2-06. Citação não cria thread.
- Reações: F2-07. Busca no histórico: F2-05.
- Histórico de versões da mensagem, editar ou apagar mensagem de outra pessoa (inclusive
  administrador) e anexos.
- Restaurar mensagem apagada.
- Edição e exclusão de mensagem de bot e a marca "dados de negócio" (ADR 0020).
- Ações otimistas na tela.
- Mais de uma instância da API do chat (ADR 0025).
- Celular e tablet.

## Notas

- Decisões desta spec registradas no LLD: menções e colunas novas (seção "Dados"); regras de menção,
  de edição e de exclusão sobre os contadores (seção "Concorrência e idempotência"); rotas, eventos,
  formato da mensagem e erros (seção "Interfaces"); comportamento do cliente (seção "Cliente");
  valores (seção "Valores e configuração"). Nenhuma passa nos três testes do ADR, e por isso não há
  ADR novo: o contador gravado já é o ADR 0021.
- Pontos que o PRD deixou abertos e esta spec resolve: o menu e o prazo de 4 horas são contados do
  `created_at`; a menção acrescentada na edição só soma a quem ainda não leu a mensagem, porque
  `mencoes` conta menções depois da leitura (a notificação da F1-06 avisa quem já leu); o trecho da
  citação é de 140 caracteres; apagar duas vezes é sucesso sem efeito, e editar mensagem apagada é
  recusada com `mensagem_apagada`.
- **A notificação de uma mensagem apagada.** O PRD (H5) pede que a notificação seja removida. A
  tabela de notificações é da F1-06, então a F1-05 entrega a base: remove as menções da mensagem
  apagada e edita as das editadas. A F1-06 deve criar a notificação a partir da menção e removê-la
  quando a menção sai; até lá, não há notificação a remover.
- A F1-05 depende da F1-04 (Especificada, ainda sem implementação): o estado de leitura, o contador
  na transação da mensagem, o evento `contagem_atualizada`, o serviço de participação com "quem
  participa" e o cache do `web` vêm de lá. Implementar depois da F1-04 estar integrada.
- A F1-06 e a F1-09 dependem da extração de menções e da tabela de menções daqui.
