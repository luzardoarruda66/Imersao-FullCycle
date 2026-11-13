---
status: aceita
---

# 0024 · Mutações do navegador ao BFF por Server Actions

O navegador faz as mutações no BFF por Server Actions do Next, e não por Route Handlers. A chamada do BFF à API do chat chega sem `Origin`, e por isso a API não consegue barrar uma requisição forjada de outro site: a defesa contra CSRF precisa ficar no BFF, e a Server Action já compara `Origin` com `Host` e funciona sem JavaScript.

Descartadas: Route Handlers REST com conferência de origem escrita à mão; token CSRF próprio.
Custo aceito: as mutações não formam uma API REST que outro cliente consiga chamar; um Route Handler, quando necessário, confere a origem por conta própria.
