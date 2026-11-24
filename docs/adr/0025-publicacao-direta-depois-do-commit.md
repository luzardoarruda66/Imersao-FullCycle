---
status: aceita
---

# 0025 · Publicação direta do evento depois do commit

A API do chat publica o evento, ao vivo e no Redis, logo depois de a transação que o causou ser confirmada no Banco do chat. Com uma instância só da API (HLD, seção 6.2), isso basta, e o evento nunca sai antes do commit nem descreve algo que a transação desfez.

Descartada: tabela de saída (`@nestjs/outbox`), que grava o evento na própria transação e o publica por um processo à parte.
Custo aceito: se o processo cair entre o commit e a publicação, o evento se perde; quem estava conectado só o vê ao recarregar, e quem reconectar também não o recebe, porque ele nunca foi guardado. A tabela de saída é o caminho quando a API passar a ter mais de uma instância ou esse risco deixar de ser tolerável.
