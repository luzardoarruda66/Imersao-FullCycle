---
paths:
  - "apps/web/**"
---

# Next.js 16.4 no Frontend/BFF

Regras de framework tiradas da documentação do Next.js 16.4 (Context7 `/vercel/next.js/v16.4.5` e a cópia local em `apps/web/node_modules/next/dist/docs/`, que é a da versão instalada e prevalece em caso de dúvida). As decisões do produto ficam no `docs/lld.md` (seção 8, "Cliente"); aqui fica só como o Next as implementa.

O `next.config.ts` liga `cacheComponents` e `partialPrefetching`. Quase tudo abaixo decorre desses dois flags.

## Cache Components

- Componente que lê `cookies()`, `headers()`, `searchParams` ou a sessão fica dentro de um `<Suspense>`. Fora dele, o build acusa o erro e a página perde o shell estático.
- Uma função `'use cache'` não lê `cookies()` nem `headers()`: isso lança erro. Leia a requisição fora dela e passe o valor (o id da pessoa, por exemplo) como argumento, ou use `'use cache: private'`, que lê os dois e guarda o resultado só no navegador.
- Argumentos e `cacheTag` de uma função em cache ficam gravados em texto puro. Use um identificador estável na chave, nunca conteúdo de mensagem ou dado pessoal.
- Para invalidar, marque a leitura com `cacheTag()` e chame `revalidateTag()` ou `updateTag()` na mutação. O tempo real não passa por aqui: mensagens, não lidas e notificações vivem no cache do SWR no cliente (LLD, seção 8).

## Partial Prefetching

- Um `<Link>` baixa o App Shell da rota: o conteúdo estático e o cache que não depende da URL. O que depende de `params` ou `searchParams` vai para trás de um `<Suspense>`.
- `<Link prefetch={true}>` pede o prefetch completo daquele link. Use só onde esperar o streaming depois da navegação não basta.
- As dicas de "instant navigation" aparecem só no overlay do dev. `export const instant = false` tira a rota da conferência, e só como medida provisória.

## Proxy (o antigo middleware)

- No Next 16, o arquivo é `src/proxy.ts`, com a função `proxy` exportada.
- O que o proxy confere está no LLD, seção 8, "Sessão no cliente". Ele roda em toda navegação, então fica sem banco e sem chamada à API do chat.
- Defina sempre o `matcher` e deixe `_next/static`, `_next/image` e os arquivos do `public/` de fora; sem ele, o proxy roda em toda requisição e o redirecionamento bloqueia CSS e JS.

## BFF: Route Handlers e Server Functions

- O navegador faz todo REST no BFF ([ADR 0002](../../docs/adr/0002-next-bff-websocket-direto.md)). Um Route Handler (`app/api/**/route.ts`) ou uma Server Function repassa o cookie de sessão à API do chat e devolve o `Set-Cookie` dela no login e na saída.
- Cada Server Function e cada Route Handler é uma porta de entrada pública: confere a sessão e a permissão sobre o recurso pedido dentro de si, mesmo que a página já tenha conferido. Esconder um botão na tela não protege nada.
- Trate `FormData`, query e headers como entrada não confiável e valide antes de repassar.
- Devolva ao cliente só o que a tela usa, nunca o registro inteiro vindo da API.
- O código que fala com a API do chat fica em módulos com `import 'server-only'` (uma camada de acesso a dados), e as Server Functions só chamam essa camada.

## APIs assíncronas

- `params` e `searchParams` de `page`, `layout` e `route` são `Promise`: use `await`. Tipe com os helpers globais `PageProps<'/rota/[id]'>` e `LayoutProps<'/rota'>`.
- `cookies()` e `headers()` também são assíncronos.

## Variáveis de ambiente

- Só variáveis com o prefixo `NEXT_PUBLIC_` chegam ao navegador, e o valor delas é congelado no `next build`. A URL do WebSocket da API do chat, que o navegador usa direto, segue essa regra: uma imagem buildada para um ambiente não serve para outro.
- A leitura indireta (`process.env[nome]`) não é inlinada.
- O LLD (seção 3, "Configuração") pede um módulo único de configuração. No Next, ele lê as variáveis de servidor num arquivo `server-only` e as `NEXT_PUBLIC_*` por nome literal.

## Server e Client Components

- Componentes são de servidor por padrão. `'use client'` vai no ponto mais baixo da árvore que precisa de estado, efeito ou API do navegador (o `socket.io-client` e o SWR entram aqui).
- O que atravessa a fronteira de servidor para cliente precisa ser serializável: dados, não funções nem instâncias de classe (as Server Functions são a exceção).

## Testes

A ferramenta de cada tipo está no LLD (seção "1. Estrutura do código"); aqui fica como montá-la, pelo guia `01-app/02-guides/testing/vitest.md` da cópia local.

- Unitário e de componente: Vitest com React Testing Library, em `jsdom`, com `@vitejs/plugin-react` e `vite-tsconfig-paths` no `vitest.config.mts`. Para clique e digitação, use o `@testing-library/user-event`, e não o `fireEvent`.
- Cubra aqui as funções puras (validação do destino guardado, schemas das Server Actions, tradução dos erros da API do chat), os Client Components e os Server Components síncronos.
- Server Component `async` não roda no Vitest: teste-o pelo Playwright, junto dos fluxos entre telas, do cookie e do proxy.
- Busque elementos pelo papel e pelo nome acessível (`getByRole`), como o usuário e o leitor de tela os encontram, e não por classe ou `data-testid`.
- Mocks são `vi.fn()`. A camada `server-only` de acesso à API do chat é substituída no teste, e nenhum teste unitário chama a API de verdade.

## Skills oficiais do Next

Para adoção ou otimização de Cache Components e Partial Prefetching, o próprio Next publica skills (`next-cache-components-optimizer`, `next-partial-prefetching-optimizer`, `next-dev-loop`). Elas estão no guia `01-app/02-guides/ai-agents.md` da cópia local. Não estão instaladas no projeto; pergunte antes de instalar.
