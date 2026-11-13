# Spec: F1-01 Entrar

Plano de implementação da F1-01 do roadmap (`docs/roadmap.md`, Fase 1). O quê e para quem está no
[PRD](prd.md); as regras e os mecanismos, no LLD (`docs/lld.md`), seções "Segurança", "Erros",
"Configuração", "Dados", "Interfaces", "Sessão e login", "Processos de segundo plano", "Cliente",
"Valores e configuração" e "Ambiente de desenvolvimento". Esta spec diz o que construir e em que
ordem, e aponta para essas seções em vez de repetir as regras.

## Problema

Hoje ninguém consegue usar o Full Cycle Chat: não há como entrar, as contas não existem nem no
banco, e a operação não tem como criá-las. O produto promete que nenhuma credencial fica legível
pelo código da página e que a sessão pode ser encerrada a qualquer momento, pelo membro ou pela
operação. Sem a F1-01, nenhuma outra funcionalidade da Fase 1 tem um membro para atender.

## Solução

O membro entra com o e-mail e a senha de uma conta criada pela operação, continua com a sessão
aberta em todas as abas do navegador até sair ou a sessão vencer sem uso, troca a própria senha
num diálogo do menu do usuário e sai pelo mesmo menu. Quem abre um link do produto sem sessão cai
na tela de entrar e, depois de entrar, volta ao link. A operação cria contas, redefine senhas,
encerra sessões e dá ou tira papéis por um comando na API do chat.

A entrega também absorve a parte da FD-02 de que precisa: a base de dados do chat com migrações, a
tabela de pessoas, a de sessões e a de tentativas de entrar, e o comando de contas. Canais,
conversas diretas e o resto da FD-02 ficam para quando a F1-02 precisar.

## Histórias de usuário

**Entrar**

1. Como membro, quero entrar com meu e-mail e minha senha, para usar o chat.
2. Como membro, quero que o e-mail seja aceito com qualquer combinação de maiúsculas e minúsculas e
   com espaços nas pontas, para não errar por causa de digitação.
3. Como membro, quero ver "E-mail ou senha incorretos" igual para e-mail inexistente e para senha
   errada, para que ninguém descubra quem tem conta.
4. Como membro, quero que o tempo de resposta seja o mesmo para e-mail inexistente e para senha
   errada, para que ninguém descubra quem tem conta medindo o tempo.
5. Como membro, quero ver o erro de validação na própria tela quando deixo o e-mail ou a senha em
   branco, ou escrevo um e-mail malformado, sem esperar a API.
6. Como membro, quero ver que o envio está em andamento, para não clicar duas vezes.
7. Como membro, quero ver uma mensagem de falha no envio quando a API não responde, para saber que
   o problema não é a minha senha.
8. Como membro, depois de 5 erros seguidos, quero ver que houve tentativas demais e quanto tempo
   falta para tentar de novo.
9. Como membro, durante a espera, quero que nem a senha certa entre, para que quem está tentando
   adivinhar não acerte por sorte.
10. Como membro, quero que um acerto zere a contagem de erros, para que erros espalhados ao longo do
    tempo não me travem.
11. Como membro, quero que a espera termine sozinha, sem precisar pedir à operação.
12. Como membro, quero que os erros de outra pessoa, de outro IP, contra o meu e-mail não me travem
    no meu computador.
13. Como membro, quero entrar usando só o teclado, enviando com Enter.
14. Como membro, quero que a tela de entrar siga o tema do meu sistema operacional, claro ou escuro,
    enquanto eu não escolher outro.
15. Como membro, quero que a tela de entrar seja acessível a leitor de tela (rótulos, erros
    anunciados, foco visível).

**Sessão e abas**

16. Como membro, quero que uma aba nova no mesmo navegador já abra com a sessão aberta.
17. Como membro, quero que a sessão continue depois de fechar e reabrir o navegador.
18. Como membro, quero que cada uso renove o prazo da sessão, para que eu só precise entrar de
    novo depois de 30 dias sem usar.
19. Como membro, quero que, com a sessão vencida ou encerrada, a próxima ação em qualquer aba me leve
    à tela de entrar, sem erro técnico na tela.
20. Como membro, quero que a minha senha e o identificador da sessão nunca fiquem legíveis pelo
    código da página.
21. Como membro, quero que uma queda da API não me tire da sessão: vejo "Não foi possível verificar
    sua sessão" com "Tentar de novo", e não a tela de entrar.
22. Como membro com a sessão aberta, quero que abrir a tela de entrar me leve direto à tela
    principal.

**Link guardado**

23. Como membro sem sessão, quero que um link do produto (de uma conversa ou de uma notificação) me
    leve à tela de entrar sem mostrar nada do conteúdo.
24. Como membro, quero cair no link que abri depois de entrar, para não precisar procurar de novo.
25. Como membro, quero que o servidor recuse os dados sem sessão, e não só a tela os esconda.
26. Como membro, quero que o destino guardado nunca me leve para fora do produto, para que um link
    malicioso não me redirecione depois de entrar.

**Sair**

27. Como membro, quero o item "Sair do Full Cycle" no menu do usuário, aberto pelo meu avatar, em
    qualquer tela com sessão.
28. Como membro, quero abrir o menu e sair usando só o teclado.
29. Como membro, quero que sair encerre a sessão no servidor, para que todas as abas daquele
    navegador percam o acesso na próxima ação.
30. Como membro, quero que sair num navegador não me tire dos outros navegadores.

**Trocar a senha**

31. Como membro, quero o item "Trocar senha" no menu do usuário, que abre um diálogo sem sair da
    tela em que estou.
32. Como membro, quero informar a senha atual e a nova duas vezes, para não errar a nova.
33. Como membro, quero ver "Senha atual incorreta." quando erro a senha atual, sem que nada mude.
34. Como membro, quero ver a regra da senha antes de digitar e, se a nova não cumprir, ver
    exatamente quais regras faltaram.
35. Como membro, quero ver "As senhas não são iguais." quando a confirmação não bate com a nova.
36. Como membro, quero ver que a troca está em andamento, para não enviar duas vezes.
37. Como membro, quero ver um erro geral quando a API não responde, com a senha intacta.
38. Como membro, depois da troca, quero continuar com a sessão aberta neste navegador e ver o aviso
    "Senha trocada", com a informação de que saí dos outros navegadores.
39. Como membro, quero que a troca encerre as minhas sessões nos outros navegadores, para cortar
    quem estiver usando a minha conta.
40. Como membro, quero trocar a senha usando só o teclado.

**Operação**

41. Como operação, quero criar a conta de um membro com e-mail e nome, e receber uma senha
    aleatória que cumpre a regra, mostrada uma vez só, para passar ao membro.
42. Como operação, quero que criar uma conta com um e-mail que já existe seja recusado, com
    qualquer combinação de maiúsculas.
43. Como operação, quero redefinir a senha de um membro e receber a senha nova uma vez só.
44. Como operação, quero que redefinir a senha encerre todas as sessões do membro.
45. Como operação, quero encerrar todas as sessões de um membro, para cortar o acesso de quem saiu
    da empresa ou perdeu o computador.
46. Como operação, quero dar e tirar o papel de administrador de um membro.
47. Como operação, quero dar e tirar a permissão de dados de um membro.
48. Como operação, quero que o comando diga com clareza quando o e-mail não tem conta.

**Desenvolvimento**

49. Como quem desenvolve, quero subir a API do chat e ver a falta de uma variável obrigatória
    derrubar o processo na subida, com o nome da variável.
50. Como quem desenvolve, quero rodar as migrações do Banco do chat dentro do contêiner.
51. Como quem desenvolve, quero que toda rota responda erros no corpo único do LLD, inclusive as do
    próprio framework.
52. Como quem desenvolve, quero o contrato das rotas novas no snapshot OpenAPI gravado no
    repositório.
53. Como quem desenvolve, quero ver no log, com nível `warn`, cada tentativa de entrar bloqueada,
    sem a senha.

## Decisões de implementação

**Arquivo de design.** O Figma do projeto passou a ser a cópia `GXeHfkmxrSH9mGMHTweQSP`, já
apontada no `AGENTS.md` e no `docs/design-system.md`. Os frames desta entrega:

| Tela | Frames | Node-ids |
| --- | --- | --- |
| Entrar | `Login / Padrão`, `Erro de validação`, `Enviando`, `Credenciais incorretas`, `Falha no envio`, `Tentativas demais` | seção `19:1276`; `19:1306`, `19:1336`, `19:1369`, `19:1399`, `86:22`, `86:54` |
| Menu do usuário | component set `UserMenu`, com o item "Trocar senha" (`icon/lock`) | `18:1964`; exemplo em `Casca / Menu do usuário / Disponível` (`25:25749`) |
| Trocar a senha | `Diálogos / Trocar senha / Padrão`, `Erro de campo`, `Senha atual incorreta`, `Salvando`, `Erro geral`, `Concluída`, e os mesmos com "(escuro)" | `2003:65080`, `2003:65194`, `2003:65310`, `2003:65428`, `2003:65548`, `2003:65661`; escuro: `2003:65733`, `2003:65845`, `2003:65961`, `2003:66079`, `2003:66197`, `2003:66310` |
| Erro de sessão | `Portas / Erro de sessão` | `19:1793` |

O microtexto é o do Figma (LLD, "Onde mora cada fato"); onde o PRD dá um texto diferente, como a
mensagem de credenciais incorretas, vale o Figma.

**Módulos da API do chat**

- **Configuração:** um módulo só, que lê e valida as variáveis com Zod na subida (LLD,
  "Configuração"). Variáveis desta entrega: conexão com o Banco do chat, `Domain` do cookie
  (vazio no local), origem do `web`, endereço de rede confiável para o `X-Forwarded-For`.
- **Banco do chat:** TypeORM com `synchronize` desligado e migrações como dono do schema (ADR 0018;
  regras em `.claude/rules/nestjs.md`). Primeira migração: pessoas, sessões e tentativas de entrar
  (LLD, "Dados"). Ids em UUID v7 gerados na aplicação (ADR 0022).
- **Contas:** pessoas com e-mail normalizado e único, nome, hash da senha, papel de administrador
  e permissão de dados. A regra da senha é uma função só, usada pela troca e pela geração de senha
  do comando, que devolve a lista de regras que faltaram.
- **Autenticação:** `@nestjs/authentication` com o `SessionCookieProvider`, o guard global (rotas
  públicas com `@Public()`) e um `SessionStore` sobre o TypeORM. Cookie, identificador, validade e
  hash: LLD, "Segurança" e "Sessão e login".
- **Limite de tentativas:** um módulo próprio, que confere a espera antes de conferir a senha,
  soma o erro, zera no acerto e devolve os segundos restantes; mais o `@nestjs/throttler` em
  memória com o teto por IP na rota de entrar (LLD, "Segurança").
- **Erros:** filtro global `@Catch()` com o corpo do LLD e os códigos desta entrega (LLD,
  "Interfaces", índice das rotas).
- **Rotas:** `POST /v1/sessoes`, `DELETE /v1/sessoes/atual`, `GET /v1/eu`, `PUT /v1/eu/senha`
  (LLD, "Interfaces"). Campos do JSON em `snake_case`.
- **Comando `contas`:** app standalone do Nest, rodado com
  `docker compose -f compose.yaml exec chat-api pnpm contas <subcomando>`. Subcomandos: `criar`,
  `redefinir-senha`, `encerrar-sessoes`, `dar-admin`, `tirar-admin`, `dar-permissao-dados`,
  `tirar-permissao-dados` (LLD, "Sessão e login", item "Operação"). O comando entra no
  `apps/chat-api/AGENTS.md`.
- **Snapshot OpenAPI:** gerado pelo `@nestjs/swagger` e gravado no repositório, com as quatro rotas
  e os códigos de erro como enum.

**Módulos do `web`**

- **Configuração:** módulo `server-only` com Zod: URL interna da API do chat
  (`http://chat-api:3001` no Compose).
- **Acesso à API do chat:** camada `server-only` que repassa o cookie `sid` no cabeçalho `Cookie`,
  manda o IP do navegador em `X-Forwarded-For` e devolve ao navegador o `Set-Cookie` da API ao
  entrar e ao sair (LLD, "Interfaces"). Traduz `sessao_invalida` em "apagar o cookie e mandar para
  entrar" e falha de rede ou 5xx em "porta Erro de sessão" (LLD, "Cliente").
- **Server Actions:** entrar, sair e trocar a senha (ADR 0024). Cada uma valida a entrada com Zod
  antes de chamar a API; o erro de validação do formulário de entrar sai daqui, sem chamar a API.
- **Proxy:** confere só se o cookie existe; sem ele, manda para `/entrar?para=<caminho>`. O
  `matcher` deixa os estáticos de fora (`.claude/rules/nextjs.md`).
- **Telas:** `/entrar` (pública) e a casca logada em `/`: Rail com o avatar de iniciais e o
  `UserMenu` só com o cabeçalho (nome, sem presença), "Trocar senha" e "Sair do Full Cycle". A
  sidebar e a área da conversa ficam vazias até a F1-02. Os outros itens do menu entram com a
  F1-06 e a F1-07.
- **Tokens e tema:** o `globals.css` recebe os tokens do `docs/design-system.md`, com o tema
  padrão vindo do sistema operacional (seção "Tema claro e escuro"). O `ThemeToggle` e a gravação
  da escolha são da F1-07.
- **Componentes:** os primitivos usados nos frames acima (`Button`, `Input`, `Field`, `Avatar`,
  `DropdownMenuItem`, `DropdownMenuSeparator`, `DialogHeader`, `Toast`) e os de casca (`Rail`,
  `UserMenu`), seguindo o fluxo "Do Figma para o código" do design system.

**Ambiente**

- `AGENTS.md` da raiz: a tabela já dá `http://chat-api:3001` como endereço entre contêineres.
- Serviço `e2e` no `compose.yaml`, com a imagem oficial do Playwright, atrás do `profile` `e2e`
  (LLD, "Ambiente de desenvolvimento").

## Decisões de teste

Um bom teste prova comportamento visível de fora: a resposta HTTP, o cookie, o que a tela mostra.
Nada de testar a implementação (chamadas internas, consultas geradas).

**Pontos de teste**

1. **E2E HTTP da API do chat** (o ponto principal): Supertest contra a app Nest de verdade e um
   Postgres de verdade, no banco `chat_test`, que o setup cria e migra. O hasher é sobrescrito com
   custo baixo (`.claude/rules/nestjs.md`). Cobre:
   - entrar certo, e-mail com maiúsculas e espaços, e-mail inexistente e senha errada com a mesma
     resposta;
   - 5 erros seguidos levam à espera, senha certa recusada na espera, `segundos_restantes` certo,
     fim da espera, acerto zerando o contador, outro IP não afetado, teto por IP;
   - cookie com os atributos do LLD, sem o token no corpo, banco guardando só o hash do token;
   - renovação por uso e vencimento depois da `duração da sessão` (com relógio controlado);
   - sair apagando só a sessão atual;
   - trocar a senha: atual errada, regras faltando listadas, sucesso mantendo a sessão atual e
     apagando as outras;
   - rotas com sessão recusando sem cookie, com cookie inválido e depois de encerrar as sessões;
   - comando `contas`: cada subcomando, e-mail duplicado, e-mail sem conta, redefinir encerrando
     as sessões;
   - corpo de erro único, inclusive para rota inexistente e JSON malformado.
   Prior art: `apps/chat-api/test/app.e2e-spec.ts` (esqueleto com Supertest e Vitest).
2. **Unitário e de componente no `web`, com Vitest e React Testing Library** (LLD, seção 1; montagem
   em `.claude/rules/nextjs.md`, "Testes"). Cobre o que não precisa de navegador nem da API:
   - a validação do destino guardado (`/caminho` aceito; `//`, `/\`, URL absoluta e vazio levam a
     `/`);
   - os schemas Zod das Server Actions (e-mail malformado, campos em branco, confirmação diferente
     da nova senha);
   - a tradução das respostas da API do chat (`sessao_invalida`, `tentativas_demais` com os
     segundos, falha de rede e 5xx);
   - os estados dos componentes de cliente do formulário de entrar e do diálogo de troca,
     buscados pelo papel e pelo nome acessível.
   Não há prior art no `web`; esta entrega cria o primeiro.
3. **E2E de navegador com Playwright**, no serviço `e2e`, contra o `web` e a `chat-api` de pé. Cobre
   o que só o navegador prova: link guardado e volta a ele, destino externo recusado, segunda aba
   já com sessão, sair derrubando a outra aba na próxima ação, cookie que ficou para trás sem laço,
   porta "Erro de sessão" com a API parada, os estados do Login e do diálogo de troca, uso só por
   teclado, tema seguindo o sistema (emulação de `prefers-color-scheme`), e a conferência do axe.
   Não há prior art; esta entrega cria o primeiro.

**Conferências à mão, no PR**

- Nota 100 de Acessibilidade no Lighthouse na tela de entrar.
- Validação visual de cada frame da tabela acima, nos dois temas, em 1440 × 900 (design system,
  "Validação visual").

## Fora do escopo

- O WebSocket: é da FD-03, que herda como critério de aceite o handshake com o mesmo cookie, a
  conferência da origem e a sessão encerrada derrubando a conexão (PRD, H4 e H6).
- O resto da FD-02: canais, conversas diretas, mensagens, bots e o diagrama de entidades.
- @usuário e os campos do perfil além do nome (F1-03 e F1-07).
- Presença no menu, "Definir como ausente", "Perfil", "Editar perfil" e "Ativar notificações do
  navegador" (F1-06 e F1-07).
- `ThemeToggle` e gravação da escolha do tema (F1-07).
- Como o BFF obtém o IP do navegador atrás do proxy da PaaS (FD-09; LLD, "Questões em aberto").
- O que o PRD deixa de fora: "esqueci a senha" pelo produto, cadastro e convite pelo produto,
  "sair de todos os lugares" pelo membro, SSO, login social, verificação em duas etapas, "lembrar
  de mim", bloqueio permanente e celular.

## Notas

- A FD-02 continua Pendente no roadmap; a parte de contas e sessões fica entregue por esta spec.
- A ordem sugerida: configuração, banco e migração; contas e comando; autenticação e limite de
  tentativas; rotas, erros e snapshot; `web` (camada de acesso, Server Actions, proxy); telas e
  componentes; testes de navegador.
- Decisões registradas nesta especificação: ADR 0023 (scrypt) e ADR 0024 (Server Actions); o
  resto está no LLD.
