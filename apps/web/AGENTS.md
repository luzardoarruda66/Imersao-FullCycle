<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ambiente de desenvolvimento

Tudo roda em contêineres, pelo `compose.yaml` da raiz; o porquê das regras está no LLD, seção 10.
O pnpm roda só dentro do contêiner, nunca no host: o `node_modules` fica na pasta do host,
compartilhada com o contêiner.

```
docker compose up -d --build                # na raiz; o contêiner instala as dependências ao subir
docker compose logs -f web                  # acompanha o pnpm install
docker compose exec web pnpm dev            # sobe o Next.js
docker compose exec web pnpm add <pacote>
docker compose exec web sh                  # shell dentro do contêiner
```

A app responde em http://localhost:3000.
Lint: `docker compose exec web pnpm lint`.

## Práticas de código

As regras de framework do Next.js 16.4 (Cache Components, Partial Prefetching, proxy, BFF,
variáveis de ambiente e a fronteira entre servidor e cliente) estão em `.claude/rules/nextjs.md`,
na raiz do repositório.
