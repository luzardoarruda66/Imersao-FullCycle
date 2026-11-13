---
status: aceita
---

# 0023 · scrypt do `@nestjs/authentication` como hash de senha

A API do chat guarda a senha com o scrypt do `PasswordHasher` do `@nestjs/authentication`, e não com Argon2id. O pacote já confere um hash falso quando o e-mail não existe, para o tempo de resposta não revelar quem tem conta, e não exige módulo nativo no contêiner. O hash descreve o próprio algoritmo, então trocar depois é refazer o hash no próximo acerto da senha.

Descartadas: Argon2id com o pacote `argon2`, nativo, num provider próprio (primeira opção da OWASP).
Custo aceito: o scrypt é a segunda opção da OWASP; o tempo constante para e-mail inexistente depende do pacote.
