# PRD: F1-01 Entrar

Funcionalidade F1-01 do roadmap (`docs/roadmap.md`, Fase 1), item 1 do "Escopo do MVP" do product brief.

## 1. Resumo executivo

- **Problema**: sem entrar, ninguém usa o chat nem pede nada a um agente, e o produto promete que nenhuma credencial fica acessível ao navegador e que a sessão pode ser encerrada a qualquer momento. Hoje as contas existem só no banco, criadas por script, e a pessoa não tem como acessá-las.
- **Solução proposta**: a pessoa entra com e-mail e senha numa conta criada pela empresa, continua logada em todas as abas do navegador por até 30 dias sem uso, sai quando quiser e troca a própria senha depois de logada.
- **Critérios de sucesso**: a F1-01 não move sozinha nenhuma métrica do product brief (seção "Objetivos e métricas de sucesso"). Ela é pré-requisito de todas: sem entrar não há "pessoas ativas na semana", o denominador de **Uso do agente**. Ela também cumpre o requisito não funcional **Sessão** do brief (seção "Requisitos não funcionais e restrições").

## 2. Experiência do usuário e funcionamento

### Personas

- **Membro do workspace**: qualquer pessoa com conta criada pela empresa. Entra, usa o chat em várias abas e sai.
- **Operação da empresa**: quem cria contas e permissões por script. Redefine senhas esquecidas e encerra sessões de quem sai da empresa.

### Fluxo do usuário

1. A pessoa abre o produto sem sessão e cai na tela de entrada, sem ver nada do chat. Se tinha aberto um link de uma conversa ou mensagem, o produto guarda só o endereço, para depois.
2. Informa e-mail e senha. Se estiverem certos, entra e vai para o destino guardado ou, sem destino, para a tela principal do chat.
3. Abre outras abas: todas já estão logadas.
4. Usa o produto. Cada uso renova a sessão; depois de 30 dias sem uso, ela vence e a pessoa volta à tela de entrada.
5. Clica em **Sair**: a sessão acaba em todas as abas daquele navegador.
6. Se esquecer a senha, pede à empresa, que a redefine por script.

### Histórias de usuário e critérios de aceite

**H1. Como membro do workspace, quero entrar com e-mail e senha para usar o chat.**

- Com e-mail e senha certos, a pessoa entra e vê a tela principal do chat.
- Com e-mail inexistente ou senha errada, a mensagem é a mesma ("E-mail ou senha incorretos") e não revela se o e-mail tem conta.
- O e-mail é aceito sem diferença entre maiúsculas e minúsculas.
- Depois de 5 tentativas erradas seguidas, a pessoa espera 15 minutos para tentar de novo e vê uma mensagem dizendo que houve tentativas demais e quanto tempo falta. Durante a espera, nem a senha certa entra.
- A tela de entrada funciona inteira por teclado, com o envio pela tecla Enter, e atinge 100 na nota de Acessibilidade do Lighthouse.
- A tela segue o design system do projeto, nos temas claro e escuro.

**H2. Como membro do workspace, quero continuar logado em todas as abas para não precisar entrar de novo a cada aba ou a cada dia.**

- Uma aba nova no mesmo navegador já abre logada.
- A sessão continua válida depois de fechar e reabrir o navegador.
- A sessão vence depois de 30 dias sem uso; cada uso renova o prazo.
- Com a sessão vencida ou encerrada, a próxima ação em qualquer aba leva à tela de entrada, sem erro técnico na tela.
- Nenhuma credencial (senha ou identificador da sessão) fica legível por código que roda na página.

**H3. Como membro do workspace, quero cair no link que abri depois de entrar para não ter que procurar a conversa de novo.**

- Sem sessão, nenhuma página do chat mostra conteúdo: quem abre um link de conversa ou de mensagem (por exemplo, o de uma notificação) vai direto para a tela de entrada, sem ver mensagens, nome do canal nem participantes. O servidor recusa os dados, e não só a tela os esconde.
- Depois de entrar, a pessoa cai na conversa ou mensagem do link. Se ela não participa daquela conversa, vale a regra de acesso da F1-02.
- O destino guardado só pode ser uma página do próprio produto.

**H4. Como membro do workspace, quero sair para que ninguém use minha conta naquele navegador.**

- O botão **Sair** fica acessível de qualquer tela logada, inclusive por teclado.
- Ao sair, a sessão é encerrada no servidor, e não só escondida na tela: todas as abas daquele navegador perdem o acesso na próxima ação ou na conexão em tempo real.
- Sessões da mesma pessoa em outros navegadores continuam válidas.

**H5. Como membro do workspace, quero trocar minha senha depois de logado para usar uma senha que só eu conheço.**

- A troca pede a senha atual e a nova senha duas vezes.
- Com a senha atual errada, a troca é recusada e a senha não muda.
- A nova senha tem no mínimo 8 caracteres, com pelo menos uma letra maiúscula, uma minúscula, um número e um símbolo. Se não cumprir, a tela diz qual regra faltou e a senha não muda.
- Depois da troca, a sessão atual continua, e as sessões da pessoa em outros navegadores são encerradas.
- A troca funciona inteira por teclado.

**H6. Como operação da empresa, quero encerrar as sessões de uma pessoa para cortar o acesso de quem saiu da empresa ou perdeu o computador.**

- Encerrar as sessões de uma pessoa, pelo script de operação, corta o acesso dela em todos os navegadores na próxima requisição ou conexão.
- Redefinir a senha de uma pessoa, pelo mesmo script, também encerra as sessões dela.

### O que não é objetivo

- "Esqueci a senha" pelo próprio produto, com link por e-mail. Quem esquece pede à empresa.
- Cadastro, convite e criação de contas pelo produto: continuam por script (Fase 2, F2-01).
- "Sair de todos os lugares" pela própria pessoa e lista de sessões abertas.
- Login corporativo (SSO), login social e verificação em duas etapas.
- Opção "lembrar de mim": toda sessão dura até 30 dias sem uso.
- Bloqueio de conta por tentativas: o bloqueio é temporário e some sozinho.
- Celular e tablet.

## 3. Requisitos do sistema de IA

Não se aplica. A F1-01 não envolve agentes.

## 4. Riscos de produto

| Risco | Mitigação |
| --- | --- |
| Alguém tenta adivinhar a senha de outra pessoa | Limite de tentativas com espera; mensagem de erro que não confirma se o e-mail tem conta |
| Pessoa que saiu da empresa continua com acesso | Script de operação encerra todas as sessões dela; redefinir a senha também encerra |
| Computador compartilhado ou perdido com sessão aberta por 30 dias | Botão Sair em todas as telas; trocar a senha encerra as sessões nos outros navegadores; a operação encerra as sessões por script |
| Pessoa esquece a senha e fica sem acesso até alguém da empresa agir | Aceito no MVP, já que as contas são criadas por script; a recuperação por e-mail fica para depois |
| Bloqueio por tentativas trava a pessoa certa, que digitou errado | Só depois de 5 erros seguidos, espera de 15 minutos e mensagem que diz quanto tempo falta |
