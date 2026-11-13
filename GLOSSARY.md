# Full Cycle Chat

Chat de equipe web em que agentes de IA atendem, dentro da conversa, pedidos de resumo, delegação de tarefas e consulta a dados de negócio.

Os termos de planejamento (Fase, Fundação, Status, Plano) estão no [roadmap](docs/roadmap.md), seção "Como ler".

## Linguagem

### Workspace e pessoas

**Workspace**:
O espaço único da empresa no produto, com todas as pessoas, conversas e agentes. Há um só por instalação.
_Evite_: organização, empresa, tenant, instância

**Membro**:
Pessoa com conta no workspace, criada pela operação.
_Evite_: usuário, cliente, participante

**Administrador**:
Membro com o papel de conectar e desconectar agentes do workspace.
_Evite_: admin, dono, moderador

**Operação**:
Quem, na empresa, cria contas e permissões, redefine senhas e encerra sessões, por script e fora do produto.
_Evite_: suporte, TI, administrador

**Permissão de dados**:
Autorização de um membro para pedir e receber dados de negócio.
_Evite_: acesso ao banco, permissão de leitura

**Perfil**:
Nome, cargo, telefone, status e presença de um membro, visíveis para todo o workspace.

**Presença**:
Se o membro está online ou ausente.
_Evite_: status (o status é a frase que o membro escreve no perfil)

### Acesso

**Conta**:
O e-mail e a senha com que um membro entra no produto.
_Evite_: login, usuário, credencial

**Sessão**:
O tempo em que um navegador fica logado como um membro, em todas as abas, até ele sair, a sessão vencer sem uso ou ser encerrada.
_Evite_: login, token, cookie

**Entrar**:
Abrir uma sessão com e-mail e senha.
_Evite_: login, logar, autenticar

**Sair**:
Encerrar a sessão do navegador em que se está.
_Evite_: logout, deslogar

**Encerrar sessões**:
Cortar o acesso de um membro: em todos os navegadores dele, pela operação ou ao redefinir a senha; nos outros navegadores, quando ele troca a senha.
_Evite_: revogar, derrubar, expulsar

**Trocar a senha**:
O próprio membro, com a sessão aberta, mudar a senha da conta informando a senha atual.
_Evite_: alterar a senha, mudar a senha

**Redefinir a senha**:
A operação dar uma senha nova à conta de um membro, sem a senha atual. Encerra as sessões dele.
_Evite_: resetar, recuperar a senha

### Conversas

**Conversa**:
Lugar onde membros e agentes trocam mensagens: um canal ou uma conversa direta.
_Evite_: chat, sala, chamada

**Canal**:
Conversa com nome, criada por um membro, pública ou privada.
_Evite_: grupo, sala

**Canal público**:
Canal de que todo o workspace participa.

**Canal privado**:
Canal que só os membros convidados veem e de que só eles participam.
_Evite_: canal fechado, canal secreto

**Conversa direta**:
Conversa entre dois membros.
_Evite_: DM, 1:1, mensagem privada, chat privado ("DMs" é só o rótulo da aba em Atividade)

**Mensagem**:
O que um membro ou um agente escreve numa conversa.
_Evite_: post, comentário

**Menção**:
Referência a um membro ou a um agente numa mensagem, com `@`.
_Evite_: marcação, tag

**Citação**:
Mensagem que responde a outra mostrando o trecho dela.
_Evite_: reply, thread, resposta (thread é outro recurso, fora do MVP)

**Não lidas**:
Mensagens de uma conversa que chegaram depois da última leitura do membro.

**Notificação**:
Aviso a um membro de uma menção, de uma mensagem numa conversa direta ou de uma tarefa, na tela e, se ele ligar, no navegador.
_Evite_: alerta, push

**Atividade**:
Tela que reúne as notificações em Menções, DMs e Tarefas.
_Evite_: caixa de entrada, inbox, feed

### Agentes

**Agente**:
Assistente de IA que um administrador conecta ao workspace como plugin e que atende pedidos feitos na conversa. Hoje há um, o `@assistente`.
_Evite_: bot, IA, robô, assistente

**Bot**:
Autor de uma mensagem que não é membro: é como um agente aparece na conversa.
_Evite_: agente (agente é quem atende o pedido; bot é só o autor da mensagem)

**Conectar agente**:
Pôr um agente no workspace, para que os membros possam mencioná-lo. Desconectar é o inverso.
_Evite_: instalar, ativar, habilitar

**Pedido**:
Mensagem que menciona um agente, ou responde a uma pergunta pendente dele, e pede algo.
_Evite_: prompt, comando, solicitação, pedido de venda (este é um dado de negócio)

**Pedido demorado**:
Pedido que o agente atende em segundo plano: ele avisa na conversa que começou e entrega o resultado quando termina, como um relatório.
_Evite_: job, tarefa (tarefa é a delegação)

**Pergunta pendente**:
Pergunta de um agente que espera a resposta de quem pediu; a próxima mensagem dessa pessoa na conversa responde, sem nova menção.

**Resposta pronta**:
Botão que um agente oferece junto de uma pergunta e que, no clique, vira a mensagem de quem pediu.
_Evite_: sugestão, atalho, quick reply

**Resumo**:
Síntese de uma conversa feita por um agente, sempre com um recorte.

**Recorte**:
O que limita um resumo: um período (hoje, desde ontem, a semana, tudo), o que uma pessoa disse ou um assunto.
_Evite_: filtro, intervalo

### Tarefas

**Delegação**:
Pedido a um agente para passar uma tarefa a outro membro, mencionado na mensagem.
_Evite_: atribuição

**Tarefa**:
Trabalho que um agente registra por delegação, com um responsável, aberto ou concluído.
_Evite_: task, to-do, pendência, ticket

**Responsável**:
O membro que recebe a tarefa e é o único que a conclui ou a reabre.
_Evite_: dono, assignee, executor

**Quem delegou**:
O membro que fez o pedido de delegação e é avisado quando a tarefa é concluída ou reaberta.
_Evite_: solicitante, criador, autor

### Dados de negócio

**Dados de negócio**:
Os dados de vendas da empresa (pedidos de venda, clientes, vendedores), que os agentes só leem e que não incluem nada do chat.
_Evite_: dados da empresa, BI, dados do chat

**Consulta**:
Leitura que um agente faz nos dados de negócio para atender um pedido.
_Evite_: query, busca, pesquisa (busca é a de pessoas)

**Lastro**:
O resultado da consulta em que um número da resposta aparece. Número sem lastro é número que o agente não pode entregar.
_Evite_: fonte, evidência, comprovação

**Mensagem bloqueada**:
Mensagem com dados de negócio, mostrada sem o conteúdo a quem não tem permissão de dados.
_Evite_: mensagem oculta, mensagem censurada

**Relatório**:
PDF com dados de negócio, gerado num pedido demorado e baixado na conversa por quem tem permissão de dados.
_Evite_: export, planilha, documento

**Auditoria**:
O registro de cada consulta: quem pediu, a conversa, a pergunta, a consulta e o desfecho, sem o resultado.
_Evite_: log, histórico

**Avaliação do agente**:
O conjunto fixo de casos que mede a qualidade das respostas de um agente e compara versões e modelos.
_Evite_: teste, benchmark, eval
