# PRD: F1-05 Menção, citação e edição

Funcionalidade F1-05 do roadmap (`docs/roadmap.md`, Fase 1), item 5 do "Escopo do MVP" do product brief (`docs/product-brief.md`). Depende da F1-04.

## 1. Resumo executivo

- **Problema**: na conversa, o membro não consegue chamar a atenção de uma pessoa específica, responder a uma mensagem sem perder o contexto, nem corrigir ou retirar o que escreveu. Os contadores de menções da F1-04 ficam zerados.
- **Solução proposta**: o membro menciona pessoas com `@`, responde citando uma mensagem, copia o texto de uma mensagem e edita ou apaga as próprias mensagens dentro do prazo de 4 horas. Toda mudança aparece para todos na hora, e as menções passam a somar no contador da F1-04.
- **Critérios de sucesso**: a F1-05 não move sozinha nenhuma métrica do product brief (seção "Objetivos e métricas de sucesso"), todas do agente. Ela cumpre os requisitos **Desempenho** (mudança visível para todos em p95 ≤ 1 s, critério do FD-03, `docs/fd-03-tempo-real/prd.md`, H6, não redefinido aqui) e **Acessibilidade** ("Tudo funciona por teclado") da seção "Requisitos não funcionais e restrições". É pré-requisito da F1-06 e da F1-09, das quais dependem **Uso do agente** e **Tempo de resposta**.

## 2. Experiência do usuário e funcionamento

### Personas

- **Membro autor**: escreve, corrige e retira mensagens.
- **Membro mencionado**: precisa saber que alguém falou com ele e onde.
- **Membro leitor**: acompanha a conversa e precisa ver a mudança sem recarregar.

### Fluxo do usuário

1. Na caixa de mensagem, o membro digita `@` e escolhe um membro numa lista filtrada pelo que digita. A menção aparece destacada.
2. Ele envia. A pessoa mencionada vê o contador de **menções** da conversa subir.
3. Ao passar sobre uma mensagem, o membro escolhe **Citar**, **Copiar texto** ou, se for dele, **Editar** e **Apagar**.
4. Ao citar, a nova mensagem mostra o trecho da original acima do texto.
5. Ao editar, a mensagem ganha o rótulo "(editada)" para todos. Ao apagar, vira "Mensagem apagada" para todos.

### Histórias de usuário e critérios de aceite

**H1. Como membro, quero mencionar outro membro com `@`, para chamar a atenção dele numa conversa.**

- Digitar `@` abre a lista de membros da conversa, filtrada por nome ou @usuário (identificador da F1-03); escolher por teclado ou mouse insere a menção.
- Só membros podem ser mencionados; agentes entram na F1-09. Em canal privado, só quem participa aparece na lista.
- A mensagem enviada mostra a menção destacada, e o contador de menções do mencionado sobe em 1 por mensagem, mesmo com a pessoa citada duas vezes no texto.
- Mencionar a si mesmo não soma contador.

**H2. Como membro, quero responder citando uma mensagem, para manter o contexto.**

- **Citar** mostra o trecho da original na caixa antes do envio, com opção de cancelar.
- A mensagem enviada mostra o trecho e o autor da original; clicar leva à original na conversa.
- Se a original for apagada, o trecho mostra "Mensagem apagada". Se for editada, mostra o texto atual.

**H3. Como membro, quero copiar o texto de uma mensagem, para reutilizá-lo.**

- **Copiar texto** põe o texto da mensagem na área de transferência e confirma com um aviso na tela.
- Em mensagem apagada, a ação não existe.

**H4. Como autor, quero editar minha mensagem, para corrigi-la.**

- Só o autor vê e usa **Editar**, e só até 4 horas depois do envio. Depois do prazo, a ação não aparece e o servidor recusa.
- A mensagem editada mostra "(editada)" para todos em até 1 s (p95) e mantém a posição na conversa.
- Menção acrescentada na edição soma contador à pessoa nova; quem já havia sido mencionado não é contado de novo. Menção removida na edição desconta o contador, se a pessoa ainda não leu.
- Editar para texto vazio não é permitido; para isso existe Apagar.

**H5. Como autor, quero apagar minha mensagem, para retirá-la.**

- Só o autor vê e usa **Apagar**, até 4 horas depois do envio, com confirmação.
- A mensagem vira "Mensagem apagada" para todos em até 1 s (p95); o conteúdo some e deixa de ser copiável.
- Os contadores de menções e de não lidas descontam a mensagem para quem ainda não a leu, e a notificação dela é removida; contadores nunca ficam negativos.
- Apagar de novo ou editar mensagem já apagada é recusado sem erro visível.

**H6. Como membro leitor, quero ver editar e apagar sem recarregar, para não agir sobre texto desatualizado.**

- Quem está com a conversa aberta vê a mudança em até 1 s (p95). Quem estava desconectado a recebe na reconexão (FD-03).
- Editar e apagar funcionam por teclado.

### O que não é objetivo

- Notificação na tela e do navegador, e a tela Atividade: F1-06. A F1-05 só soma o contador.
- Menção a agentes: F1-09. `@canal` e `@todos`: fora do MVP.
- Thread: Fase 2 (F2-06). Citação não cria thread.
- Histórico de versões da mensagem, reações, editar ou apagar mensagem de outra pessoa e anexos.

## 3. Requisitos do sistema de IA

Não se aplica. Mensagens com menção a agentes entram na F1-09.

## 4. Riscos de produto

| Risco | Mitigação |
| --- | --- |
| Contador de menções divergir ao editar ou apagar | Critérios de H4 e H5 exigem desconto sem ficar negativo; a spec cobre a concorrência (`docs/lld.md`, "Concorrência e idempotência") |
| Pessoa agir sobre texto desatualizado | H6: mudança em até 1 s (p95) |
| Apagar por engano | Confirmação em H5 |
| Menção virar spam | Uma contagem por mensagem e por pessoa; sem `@todos` |
| Prazo de 4 horas frustrar quem percebe o erro depois | O prazo é regra de produto fixa no MVP; a spec o define como constante única |
