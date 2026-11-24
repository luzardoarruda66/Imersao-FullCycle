# PRD: FD-03 Tempo real

Fundação FD-03 do roadmap (`docs/roadmap.md`), base do item 4 do "Escopo do MVP" do product brief (`docs/product-brief.md`): ver as mensagens chegarem em tempo real.

## 1. Resumo executivo

- **Problema**: hoje o navegador só vê o que pede. Sem um canal que o servidor use para empurrar eventos, nenhuma mensagem, notificação ou resposta de agente chega sem recarregar a página. Uma queda de conexão (rede, suspensão do notebook) deixaria o membro com a conversa defasada, sem saber que perdeu algo.
- **Solução proposta**: o navegador de um membro com sessão abre uma conexão em tempo real autenticada pelo cookie de sessão, recebe eventos com formato único e conhecido e, depois de uma queda, recebe o que perdeu ou é avisado de que precisa recarregar pelo histórico.
- **Critérios de sucesso**: o FD-03 não move sozinho nenhuma métrica do product brief (seção "Objetivos e métricas de sucesso"). Ele cumpre o requisito **Desempenho** ("Mensagens em tempo real, sem atraso perceptível, e recuperação do que se perdeu numa queda de conexão") e o requisito **Sessão** ("a sessão é revogável") na conexão em tempo real (seção "Requisitos não funcionais e restrições"). Ele é pré-requisito da F1-04 e da F1-07 (`docs/roadmap.md`), das quais dependem o **Tempo de resposta** e o **Uso do agente** percebidos pela pessoa.

## 2. Experiência do usuário e funcionamento

### Personas

- **Membro do workspace**: mantém o chat aberto em uma ou mais abas e espera que o que acontece nas conversas dele chegue sem recarregar, mesmo depois de uma queda de rede.
- **Pessoa desenvolvedora das funcionalidades seguintes (F1-04, F1-07 e outras)**: usa a conexão e os eventos tipados como base, sem reinventar autenticação, formato de evento nem recuperação.
- **Operação da empresa**: encerra sessões e espera que a conexão em tempo real caia junto.

### Fluxo do usuário

1. O membro entra e abre o chat; o navegador abre a conexão em tempo real sozinho, sem pedir nada ao membro.
2. A conexão recebe só os eventos a que aquele membro tem direito.
3. A rede cai. O navegador tenta reconectar sozinho.
4. Ao voltar dentro de 15 minutos, o membro recebe os eventos que perdeu, na ordem, sem duplicar nem pular nenhum, e a interface não precisa recarregar.
5. Ao voltar depois de mais de 15 minutos, o navegador é avisado de que o que perdeu não está mais disponível e recarrega pelo histórico.
6. Se a sessão acabou (o membro saiu, ela venceu ou a operação a encerrou), a conexão é recusada ou fechada e o membro vai para "Entrar".

### Histórias de usuário e critérios de aceite

**H1. Como membro do workspace, quero que o chat se conecte sozinho ao abrir, para receber atualizações sem recarregar.**

- Com sessão válida, a conexão abre sem nenhuma ação do membro.
- A conexão usa o mesmo cookie da sessão; nenhuma credencial é enviada por código da página.
- Sem sessão válida, ou com origem não permitida, a conexão é recusada e nenhum evento sai.
- Duas abas do mesmo navegador abrem duas conexões, e ambas recebem os eventos do membro.

**H2. Como membro do workspace, quero que minha conexão caia quando minha sessão acabar, para que ninguém use minha conta depois de eu sair.**

- Ao sair, ao vencer a sessão ou quando a operação encerra as sessões, as conexões da sessão fecham em até 5 s, e o navegador vai para "Entrar".
- Depois de fechada, a reconexão automática é recusada.
- As conexões de outros navegadores do mesmo membro continuam abertas quando só uma sessão acabou.

**H3. Como membro do workspace, quero receber só os eventos que me dizem respeito, para não ver conteúdo de conversas de que não participo.**

- Um evento de conversa só chega a quem participa dela (regra de acesso da F1-02, em `docs/roadmap.md`).
- Quem não participa de um canal privado não recebe nenhum evento dele, nem de metadados como nome ou participantes.
- O evento de mensagem de dados de negócio segue a regra pessoa a pessoa registrada em `docs/hld.md` e `docs/lld.md`: quem tem permissão de dados recebe o conteúdo, e os outros recebem a versão bloqueada.

**H4. Como membro do workspace, quero receber o que perdi numa queda, para não precisar recarregar a página nem perder mensagens.**

- Com queda de até 15 minutos, ao reconectar o membro recebe, em ordem, todos os eventos publicados para ele durante a queda, sem duplicar nem pular nenhum.
- Os eventos reenviados têm o mesmo formato dos eventos ao vivo.
- Com queda maior que 15 minutos, a conexão informa "perdido" e o navegador recarrega pelo histórico paginado, sem erro técnico na tela.
- Se os eventos guardados forem perdidos (por exemplo, o armazenamento reinicia), o efeito é o mesmo do "perdido": recarregar pelo histórico, sem perder dados, já que a verdade fica no Banco do chat.

**H5. Como pessoa que desenvolve as funcionalidades seguintes, quero eventos com tipos compartilhados entre servidor e navegador, para que um evento novo não quebre o outro lado sem aviso.**

- Todo evento tem um tipo conhecido e um formato único, definido num lugar só e usado pelo servidor e pelo navegador.
- Um evento fora do formato conhecido não sai do servidor.
- A conexão tem um evento de diagnóstico, que prova ponta a ponta (servidor ao navegador) a entrega e a reposição, sem depender das conversas da F1-02.
- O evento só é publicado depois que a gravação que o causou foi confirmada no Banco do chat: nenhum evento descreve algo que não existe.

**H6. Como membro do workspace, quero que a entrega seja rápida, para sentir as mudanças em tempo real.**

- Entre a gravação confirmada e o evento chegar à conexão de quem está conectado, o tempo é de p95 ≤ 1 s, medido numa instância da API do chat, com 50 conexões simultâneas e 20 eventos por segundo.
- O comportamento é coberto por teste automático que roda no ambiente de desenvolvimento (Docker Compose), incluindo queda e reconexão.

### O que não é objetivo

- Mostrar mensagens chegando na tela, "digitando", contagem de não lidas e histórico paginado: F1-04.
- Presença e edição do perfil em tempo real: F1-07.
- Notificações do navegador (`docs/roadmap.md`).
- Indicador visual de conexão ("conectado", "reconectando"): fica para a F1-04.
- Mais de uma instância da API do chat, com publicação entre instâncias (`docs/hld.md`, seção 6.2: instância única).
- Entrega garantida para quem fica mais de 15 minutos desconectado: nesse caso o histórico é a fonte da verdade.
- Aplicativo de celular ou tablet (`docs/product-brief.md`).

## 3. Requisitos do sistema de IA

Não se aplica: o FD-03 não envolve agentes. Os eventos de resposta de agente usam esta base mais adiante (`docs/roadmap.md`).

## 4. Riscos de produto

| Risco | Mitigação |
| --- | --- |
| O evento chega antes do dado ser gravado, e o membro vê algo que depois some | Publicar só depois da gravação confirmada (H5); a spec decide o mecanismo (questão em aberto do `docs/lld.md`). |
| O evento chega a quem não deve (canal privado, dado de negócio) | Conferir participação e permissão de dados na entrega, e não só na tela (H3). |
| Membro desconectado por mais de 15 minutos acha que está atualizado | A conexão sempre responde "perdido" e força a recarga pelo histórico (H4). |
| A conexão continua aberta depois de sair ou de a operação encerrar a sessão | Fechar as conexões da sessão em até 5 s (H2). |
| Redis fora do ar | Perder os eventos guardados só obriga a recarregar pelo histórico (`docs/hld.md`, seção 7); o chat segue funcionando sem reposição. |
| Retenção de 15 minutos curta demais para o uso real | Valor revisável por configuração; validar com o uso real da F1-04. |
