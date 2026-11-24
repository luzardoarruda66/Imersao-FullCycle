// Variáveis lidas pelo módulo de configuração (único lugar que lê `process.env` na app).
process.env.DATABASE_URL = 'postgres://chat_api:chat_api@postgres:5432/chat_test';
process.env.COOKIE_DOMAIN = '';
process.env.WEB_ORIGIN = 'http://localhost:3000';
process.env.TRUSTED_PROXY = 'loopback';
// Banco lógico 1 do Redis só dos testes: o setup o limpa, o desenvolvimento usa o 0.
process.env.REDIS_URL = 'redis://redis:6379/1';
