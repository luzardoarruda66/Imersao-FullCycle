# PRD: F1-03 Pessoas e perfis

Funcionalidade F1-03 do roadmap (`docs/roadmap.md`, Fase 1), item 3 do "Escopo do MVP" do product brief (`docs/product-brief.md`).

## 1. Resumo executivo

- **Problema**: a lista de membros da F1-02 mostra só o nome, então achar a pessoa certa e saber quem ela é fica difícil quando o workspace cresce. Além disso, a Menção (F1-05) e a Delegação (F1-10) precisam de um identificador de membro, e hoje a conta tem só e-mail e senha.
- **Solução proposta**: o membro busca outros membros por nome ou @usuário, abre uma conversa direta a partir do resultado e vê o Perfil de qualquer membro. Cada membro passa a ter um @usuário único, definido pela operação junto com a conta.
- **Critérios de sucesso**: a F1-03 não move sozinha nenhuma métrica do product brief (seção "Objetivos e métricas de sucesso"). É pré-requisito de **Uso do agente** e de **Tarefas delegadas concluídas**, porque a Menção e a Delegação identificam membros pelo @usuário. Cumpre o requisito de **Acessibilidade** do brief (seção "Requisitos não funcionais e restrições"): tudo funciona por teclado.

## 2. Experiência do usuário e funcionamento

### Personas

- **Membro**: qualquer pessoa com conta no workspace. Busca, abre conversas diretas e consulta Perfis.
- **Operação**: define o @usuário de cada membro ao criar a conta, por script e fora do produto.

### Fluxo do usuário

1. O membro abre a busca de pessoas e digita parte de um nome ou de um @usuário.
2. A lista de resultados mostra, para cada membro, nome e @usuário.
3. Ele escolhe um resultado e abre uma conversa direta (a existente, se já houver) ou o Perfil dessa pessoa.
4. No Perfil, vê nome, @usuário, cargo, telefone e status, e pode abrir a conversa direta dali.

### Histórias de usuário e critérios de aceite

**H1. Como membro, quero buscar pessoas por nome ou @usuário para encontrar quem procuro sem rolar a lista.**

- A busca aceita parte do nome ou do @usuário, sem diferenciar maiúsculas, minúsculas e acentos.
- Digitar `@maria` ou `maria` retorna os mesmos membros: o `@` inicial é ignorado.
- Os resultados mostram nome e @usuário, com o nome em ordem alfabética.
- Sem resultado, a tela mostra uma mensagem e não uma lista vazia.
- O membro que busca não aparece nos próprios resultados.
- A busca responde em até 200 ms (p95) num workspace de 500 membros.
- Funciona por teclado: digitar, navegar pelos resultados e escolher.

**H2. Como membro, quero abrir uma conversa direta a partir da busca para falar com a pessoa na hora.**

- Escolher um resultado abre a conversa direta com ela. Se já existe, leva à existente, sem criar outra (regra da F1-02, H5).
- A busca substitui a lista só de nomes oferecida pela F1-02 para escolher com quem abrir a conversa.

**H3. Como membro, quero ver o Perfil de qualquer pessoa para saber quem ela é.**

- O Perfil mostra nome, @usuário, cargo, telefone e status.
- Campo não preenchido não aparece vazio nem com texto técnico: a tela o omite ou mostra "Não informado".
- Todo membro vê o Perfil de todos os outros membros, sem restrição de visibilidade.
- Do Perfil, o membro abre a conversa direta com a pessoa.
- Abrir o Perfil de um membro que não existe mostra a tela de "não encontrado".
- O membro vê o próprio Perfil igual ao dos outros. A edição é a F1-07.

**H4. Como operação, quero definir um @usuário único para cada membro ao criar a conta, para que ele identifique a pessoa.**

- Todo membro tem um @usuário, e não existem dois iguais, sem diferenciar maiúsculas e minúsculas.
- O @usuário usa letras minúsculas, números, ponto, hífen e sublinhado, de 3 a 30 caracteres.
- Criar a conta sem @usuário, ou com um repetido ou inválido, é recusado pelo comando da operação com mensagem clara.
- Contas que já existem recebem @usuário numa migração, sem apagar dados. A decisão técnica de como fazer fica na spec.
- O @usuário não muda pelo produto. Trocá-lo é feito pela operação.

**H5. Como membro, quero que a busca e o Perfil sigam o padrão visual do produto para usá-los com conforto.**

- Seguem o design system (`docs/design-system.md`), nos temas claro e escuro.
- Atingem 100 na nota de Acessibilidade do Lighthouse.

### O que não é objetivo

- Editar o próprio Perfil e escolher o tema: F1-07.
- Presença (online ou ausente) no Perfil e na busca: F1-07. O termo "Perfil" do glossário inclui a presença, e a F1-03 mostra o Perfil sem ela.
- Mencionar com `@` dentro de uma mensagem: F1-05. A F1-03 só cria o identificador que ela usa.
- Busca de mensagens e de conversas: F2-05.
- Foto de perfil (avatar).
- Troca do @usuário pelo próprio membro.
- Busca por cargo, telefone ou status.
- Buscar e abrir agentes: F1-08.
- Celular e tablet.

## 3. Requisitos do sistema de IA

Não se aplica. A F1-03 não envolve agentes.

## 4. Riscos de produto

| Risco | Mitigação |
| --- | --- |
| Dois membros com @usuário parecidos (`joao.silva` e `joao_silva`) levam a abrir a conversa com a pessoa errada | Os resultados mostram nome e @usuário juntos, e o Perfil confirma quem é antes ou depois de abrir a conversa |
| A visibilidade do telefone para todo o workspace expõe um dado pessoal | Segue o glossário (Perfil visível a todos). O campo é opcional e só o próprio membro o preenche, na F1-07; o risco fica registrado |
| @usuário atribuído por script sai errado ou duplicado e é difícil de corrigir | A operação valida unicidade e formato no comando de criação; a troca do @usuário fica com a operação |
| A busca fica lenta ou confusa com muitos membros | Meta de p95 ≤ 200 ms, ordem alfabética e busca por parte do nome |
| A F1-05 e a F1-10 dependem de um @usuário que a F1-03 define, e uma mudança de formato depois quebra as menções | O formato é fixado neste PRD e na spec antes da F1-05 |
