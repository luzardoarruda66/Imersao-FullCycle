#!/usr/bin/env bash
# Roda os testes de navegador (Playwright) do `web`, no serviço `e2e` do Compose (LLD, seção 10).
# Pré-requisito: `docker compose -f compose.yaml up -d --build --wait`, com a `chat-api` e o `web` de pé
# (`pnpm start:dev` e `pnpm dev --hostname 0.0.0.0`) e as migrações aplicadas.
set -euo pipefail
cd "$(dirname "$0")/.."
COMPOSE="docker compose -f compose.yaml"

# Uma conta por cenário que muda estado, com a senha gerada pelo comando `contas` (mostrada uma vez só).
accounts='{'
for name in link abas sair senha; do
  email="e2e-${name}@fullcycle.dev"
  out=$($COMPOSE exec -T chat-api pnpm contas redefinir-senha "$email" 2>&1 || true)
  if ! grep -q "Senha (mostrada" <<<"$out"; then
    out=$($COMPOSE exec -T chat-api pnpm contas criar "$email" "E2E $name")
  fi
  password=$(sed -n 's/.*Senha (mostrada uma vez só): //p' <<<"$out" | head -n1)
  accounts+="\"$name\":{\"email\":\"$email\",\"password\":\"$password\"},"
done
accounts="${accounts%,}}"

$COMPOSE --profile e2e run --rm -e E2E_ACCOUNTS="$accounts" e2e npx playwright test --project=principal "$@"

# A `chat-api` parada prova a porta "Erro de sessão".
$COMPOSE stop chat-api
trap '$COMPOSE start chat-api >/dev/null' EXIT
$COMPOSE --profile e2e run --rm -e E2E_ACCOUNTS="$accounts" e2e npx playwright test --project=api-parada "$@"
