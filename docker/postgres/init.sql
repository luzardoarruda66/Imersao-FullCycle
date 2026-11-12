-- Roda só na primeira subida do volume postgres-data. Senhas apenas para desenvolvimento.

-- Banco do chat: dono é a API do chat (migrações do TypeORM).
CREATE ROLE chat_api LOGIN PASSWORD 'chat_api';
CREATE DATABASE chat OWNER chat_api;
REVOKE ALL ON DATABASE chat FROM PUBLIC;

-- Banco dos agentes: dono é o projeto agents.
CREATE ROLE agents LOGIN PASSWORD 'agents';
CREATE DATABASE agents OWNER agents;
REVOKE ALL ON DATABASE agents FROM PUBLIC;

-- Banco de negócio: carregado pelo script de carga (como postgres) e só lido pelos agentes (ADR 0013).
CREATE DATABASE business;
CREATE ROLE business_readonly LOGIN PASSWORD 'business_readonly';
REVOKE ALL ON DATABASE business FROM PUBLIC;
GRANT CONNECT ON DATABASE business TO business_readonly;

\connect business
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO business_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO business_readonly;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO business_readonly;
