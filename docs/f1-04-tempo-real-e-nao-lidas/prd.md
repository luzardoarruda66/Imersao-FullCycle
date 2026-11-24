# PRD: F1-04 Tempo real e não lidas

Funcionalidade F1-04 do roadmap (`docs/roadmap.md`, Fase 1), item 4 do "Escopo do MVP" do product brief (`docs/product-brief.md`). Depende da F1-02 e do FD-03.

## 1. Resumo executivo

- **Problema**: a F1-02 entrega conversas, mas o membro precisa recarregar a tela para ver mensagens novas, não sabe quem está escrevendo, só alcança as mensagens mais recentes e não sabe em qual conversa há coisa nova para ler. Assim o chat não parece um chat.
- **Solução proposta**: a tela de chat reage a cada evento recebido pela conexão em tempo real do FD-03: mensagens aparecem sem recarregar, o aviso de "digitando" aparece nos canais e nas conversas diretas, o histórico carrega por páginas ao rolar para trás, e cada conversa mostra a contagem de não lidas e de menções. Um indicador diz se a conexão está ativa.
- **Critérios de sucesso**: a F1-04 não move sozinha nenhuma métrica do product brief (seção "Objetivos e métricas de sucesso"), que são todas do agente. Ela cumpre o requisito **Desempenho** do brief ("Mensagens em tempo real, sem atraso perceptível, e recuperação do que se perdeu numa queda de conexão", seção "Requisitos não funcionais e restrições") e o requisito **Acessibilidade** ("Tudo funciona por teclado"). Ela é pré-requisito da F1-05 e da F1-09, das quais dependem **Uso do agente** e **Tempo de resposta** percebidos pela pessoa (`docs/roadmap.md`). O critério de tempo (p95 ≤ 1 s) é o do FD-03 (`docs/fd-03-tempo-real/prd.md`, H6) e não é redefinido aqui.

## 2. Experiência do usuário e funcionamento

### Personas

- **Membro**: conversa em canais e conversas diretas e quer ver a conversa andar sem recarregar.
- **Membro que volta depois de um tempo**: abre o workspace e precisa ver onde há mensagens novas e onde foi mencionado.

### Fluxo do usuário

1. O membro entra (F1-01) e abre o chat. A conexão em tempo real abre sozinha e o indicador mostra "conectado".
2. A lista de conversas mostra, ao lado de cada conversa, a contagem de **não lidas** e a de **menções**.
3. Ele abre uma conversa. Vê as mensagens mais recentes e, ao rolar para cima, as anteriores são carregadas por páginas.
4. Outra pessoa envia uma mensagem. Ela aparece na hora, sem ação do membro.
5. Outra pessoa começa a digitar. O membro vê o aviso, que some quando ela envia ou para de digitar.
6. A conexão cai. O indicador mostra "reconectando". Na volta, o membro recebe o que perdeu (FD-03) ou a tela recarrega pelo histórico.
7. Ele lê a conversa e a contagem de não lidas dela volta a zero.

### Histórias de usuário e critérios de aceite

**H1. Como membro, quero ver as mensagens chegarem sem recarregar a tela, para conversar em tempo real.**

- Quando duas pessoas estão na mesma conversa, a mensagem enviada por uma aparece para a outra sem recarregar e sem ação.
- Cada evento recebido pela conexão em tempo real atualiza a interface; a tela não pede o histórico de novo para mostrar uma mensagem nova.
- A mensagem aparece em p95 ≤ 1 s depois da gravação (critério do FD-03, `docs/fd-03-tempo-real/prd.md`, H6).
- Uma mensagem entregue duas vezes (reposição depois de reconexão) aparece uma vez só.
- A mensagem que chega com a conversa aberta mantém a rolagem no fim se o membro já estava no fim; se ele estava lendo o histórico, a rolagem não pula e a tela avisa que há mensagens novas.

**H2. Como membro, quero saber quando alguém está digitando, para esperar a resposta.**

- Em canais e conversas diretas, quando uma só pessoa digita, a tela mostra "@usuário está digitando".
- Quando mais de uma digita, mostra "Há N pessoas digitando...", com N igual ao número de pessoas.
- Em canal com mais de 15 membros, o aviso não aparece.
- O aviso some quando a pessoa envia a mensagem ou fica sem digitar por um intervalo (valor a definir na spec).
- O membro não vê o próprio "digitando".
- O aviso chega só a quem participa da conversa (canal privado não vaza para quem não foi convidado).

**H3. Como membro, quero carregar o histórico aos poucos, para ler mensagens antigas sem esperar a conversa inteira.**

- Ao rolar para o início, a tela carrega a página anterior e mantém a posição de leitura.
- Quando não há mais mensagens, a tela indica o início da conversa e não faz novas chamadas.
- Mensagens nunca se repetem nem se perdem entre páginas, mesmo se chegarem mensagens novas durante a navegação.
- O tamanho da página é `A definir` (spec, e `docs/lld.md`, "Questões em aberto").

**H4. Como membro, quero ver quantas mensagens não li em cada conversa, para saber onde há coisa nova.**

- A lista de conversas mostra a contagem de não lidas de cada conversa; conversa sem não lidas não mostra contagem.
- Mensagem nova numa conversa que não está aberta soma 1 à contagem dela na hora, sem recarregar.
- Mensagem nova numa conversa aberta e visível não gera não lida.
- Ao ler a conversa, a contagem volta a zero, também nas outras abas abertas do mesmo membro.
- A mensagem do próprio membro nunca conta como não lida para ele.
- Se a leitura não chega até a última mensagem, a contagem restante segue a regra do `docs/lld.md` ("Questões em aberto"); a spec a fecha.

**H5. Como membro, quero ver a contagem de menções, para achar onde me chamaram.**

- A contagem de menções aparece ao lado da de não lidas, em cada conversa.
- Até a F1-05 ela aparece zerada, sem erro e sem ficar escondida; a F1-04 só entrega o contador e o lugar na tela.
- Ao ler a conversa, a contagem de menções também volta a zero.

**H6. Como membro, quero saber se estou conectado, para confiar no que vejo na tela.**

- O indicador mostra "conectado" e "reconectando".
- Em "reconectando", o membro entende que pode estar sem mensagens novas.
- Ao reconectar, o indicador volta a "conectado" e a tela recebe o que perdeu ou recarrega pelo histórico (FD-03).
- Sessão encerrada manda o membro para "Entrar" (FD-03).
- O indicador é legível por leitor de tela e a tela inteira funciona por teclado.

**Critério geral de qualidade.** A interface segue o `docs/design-system.md` e atinge 100% na nota de Acessibilidade do Lighthouse.

### O que não é objetivo

- Mencionar pessoas, citar, editar, apagar e copiar texto: F1-05. A menção só aparece como contador zerado.
- Notificações do navegador e da central de notificações: fora da F1-04.
- Presença e edição do perfil em tempo real: F1-07.
- Reações: F2-07.
- Resumo da conversa e respostas dos agentes: F1-09 e as funcionalidades de agente.
- "Digitando" em canal com mais de 15 membros.
- Redefinir o critério de tempo, o formato de evento ou a recuperação após queda: são do FD-03.
- Busca no histórico.

## 3. Requisitos do sistema de IA

Não se aplica: a F1-04 não envolve agente.

## 4. Riscos de produto

| Risco | Mitigação |
| --- | --- |
| Contagem de não lidas errada (soma duas vezes uma mensagem repetida na reposição, ou não zera) mina a confiança | Critério de H4 e de H1 sobre mensagem repetida; teste com mensagem entregue duas vezes e com duas abas abertas |
| Um canal grande com muita gente digitando enche a tela de avisos | Limite de 15 membros e aviso agregado ("Há N pessoas digitando...") |
| O membro lê o histórico e a rolagem pula com a chegada de mensagem nova | Critério de H1: a rolagem não se move e a tela avisa |
| Contagem de menções zerada até a F1-05 parece defeito | Critério de H5: aparece zerada de forma deliberada; a spec e o roadmap registram a dependência |
| A conexão cai sem o membro perceber e ele acha que ninguém escreve | Indicador de conexão (H6) e recuperação do FD-03 |
| "Digitando" vaza para quem não pode ver a conversa (canal privado) | Critério de H2: o aviso só chega a quem participa |
