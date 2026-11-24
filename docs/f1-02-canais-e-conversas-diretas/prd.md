# PRD: F1-02 Canais e conversas diretas

Funcionalidade F1-02 do roadmap (`docs/roadmap.md`, Fase 1), item 2 do "Escopo do MVP" do product brief (`docs/product-brief.md`).

## 1. Resumo executivo

- **Problema**: a aposta do produto é o agente dentro da conversa. Sem canais e conversas diretas não há onde mencioná-lo nem onde o time converse, e todas as funcionalidades de chat e de agente dependem de existir uma conversa.
- **Solução proposta**: o membro lê e escreve mensagens em canais públicos, canais privados e conversas diretas, cria canais públicos ou privados e convida membros para um canal privado, que só os convidados veem e acessam.
- **Critérios de sucesso**: a F1-02 não move sozinha nenhuma métrica do product brief (seção "Objetivos e métricas de sucesso"). É pré-requisito de **Uso do agente**: sem conversa não há pedido a agente. Ela cumpre o requisito não funcional **Permissão** do brief (seção "Requisitos não funcionais e restrições") no que diz respeito a canal privado: só convidado vê e participa.

## 2. Experiência do usuário e funcionamento

### Personas

- **Membro**: qualquer pessoa com conta no workspace. Conversa, cria canais, convida e abre conversas diretas.
- **Convidado**: membro adicionado a um canal privado, que passa a vê-lo e a escrever nele.

### Fluxo do usuário

1. O membro entra (F1-01) e vê a lista de conversas: canais públicos, canais privados dos quais participa e conversas diretas.
2. Abre uma conversa e lê as mensagens, da mais antiga para a mais nova.
3. Escreve uma mensagem e a envia; ela aparece na conversa para todos que participam.
4. Cria um canal, escolhendo nome e se é público ou privado. Num canal privado, convida membros.
5. Abre uma conversa direta com outro membro e troca mensagens.
6. Um membro que não foi convidado a um canal privado não o vê na lista nem o abre por link.

### Histórias de usuário e critérios de aceite

**H1. Como membro, quero conversar em canais públicos para falar com todo o workspace.**

- Todo membro vê e participa de todos os canais públicos, sem convite.
- Ao enviar uma mensagem, ela aparece na conversa com autor e horário.
- Mensagem vazia ou só de espaços não é enviada, e mensagem com mais de 4.000 caracteres é recusada com aviso.
- O envio funciona por teclado, com a tecla Enter.

**H2. Como membro, quero criar um canal público ou privado para organizar um assunto.**

- Criar pede um nome e a escolha entre público e privado.
- O canal criado aparece na lista de quem pode vê-lo: todos, no público; só o criador, no privado.
- Nome vazio é recusado com mensagem. Nome repetido é recusado, sem diferenciar maiúsculas e minúsculas e ignorando espaços nas pontas.
- O nome tem de 1 a 80 caracteres.

**H3. Como membro, quero convidar pessoas para um canal privado para que só quem precisa participe.**

- Qualquer membro de um canal privado pode convidar outros membros.
- O convidado passa a ver o canal e a escrever nele; vê também as mensagens anteriores ao convite.
- Convidar quem já participa não duplica nem dá erro técnico.

**H4. Como membro, quero que canal privado seja invisível a quem não foi convidado para ter confidencialidade.**

- O canal privado não aparece na lista nem em link para quem não foi convidado.
- Abrir o link de um canal privado sem ser convidado mostra a mesma resposta de um canal que não existe.
- O servidor recusa os dados de um canal privado a quem não participa, em qualquer rota. Não basta a tela esconder.
- Quem não participa de um canal privado não consegue enviar mensagem nele.

**H5. Como membro, quero abrir uma conversa direta com outro membro para falar em particular.**

- A conversa direta existe entre dois membros e só os dois a veem e escrevem nela.
- Abrir uma conversa direta com quem já tem uma conversa direta com o membro leva à existente, sem criar outra.
- Para escolher com quem abrir, esta funcionalidade oferece a lista de membros; a busca por nome ou @usuário e o perfil ficam na F1-03. A lista mostra só o nome.
- Abrir conversa direta consigo mesmo é recusado.

**H6. Como membro, quero ver a lista das minhas conversas para ir de uma a outra.**

- A lista separa canais (públicos e privados) de conversas diretas, em ordem alfabética nos canais.
- Funciona inteira por teclado.
- Atinge 100 na nota de Acessibilidade do Lighthouse e segue o design system (`docs/design-system.md`), nos temas claro e escuro.

### O que não é objetivo

- Ver mensagens chegarem sem recarregar, aviso de "digitando", histórico paginado e contagem de não lidas e de menções: F1-04.
- Menção, citação, copiar texto, editar e apagar mensagens: F1-05.
- Buscar pessoas por nome ou @usuário e ver perfil: F1-03.
- Notificações e tela Atividade: F1-06.
- Entrar e sair de canais, remover membros de canal privado: F2-04 e F2-03.
- Renomear, arquivar ou apagar canais.
- Threads, reações e anexos: Fase 2.
- Conversa direta com mais de dois membros.
- Agentes nas conversas: F1-08 em diante.
- Celular e tablet.

## 3. Requisitos do sistema de IA

Não se aplica. A F1-02 não envolve agentes.

## 4. Riscos de produto

| Risco | Mitigação |
| --- | --- |
| Membro vê canal privado de que não participa | Recusa no servidor em toda rota, com teste de acesso por papel; resposta igual à de canal inexistente |
| Membro cria canal público quando queria privado e expõe conteúdo | A escolha entre público e privado é explícita e sem valor padrão no formulário. A conversão fica fora do MVP |
| Sem tempo real, a conversa parece quebrada (é preciso recarregar) | Resolvido nesta entrega: a mensagem e a conversa novas chegam na hora pelo canal da FD-03 |
| Convidado errado entra num canal privado e não dá para removê-lo | Aceito no MVP, pois remover é F2-03; o risco fica registrado |
| Muitas conversas deixam a lista confusa | Ordem alfabética e separação entre canais e conversas diretas; busca de conversas fica fora |
