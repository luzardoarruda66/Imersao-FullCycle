import { test as base, expect, type Page } from "@playwright/test";

interface Account {
  email: string;
  password: string;
}

/** Contas criadas por `scripts/e2e.sh` com o comando `contas`, uma por cenário que muda estado. */
export function account(name: string): Account {
  const accounts = JSON.parse(process.env.E2E_ACCOUNTS ?? "{}") as Record<string, Account>;
  const found = accounts[name];
  if (!found) throw new Error(`Conta de teste "${name}" ausente em E2E_ACCOUNTS; rode scripts/e2e.sh`);
  return found;
}

// Cada teste chega à API com o próprio IP (`X-Forwarded-For`), para o teto por IP de tentativas de entrar não somar entre testes.
export const test = base.extend({
  extraHTTPHeaders: async ({}, provide) => {
    const octet = () => 1 + Math.floor(Math.random() * 250);
    await provide({ "x-forwarded-for": `10.${octet()}.${octet()}.${octet()}` });
  },
});

export { expect };

export async function signIn(page: Page, { email, password }: Account, from = "/entrar") {
  await page.goto(from);
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha").fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
  // Espera a Server Action gravar o cookie e redirecionar, antes de o teste seguir.
  await page.waitForURL((url) => !url.pathname.startsWith("/entrar"));
}

export async function openUserMenu(page: Page) {
  await page.getByRole("button", { name: /Menu do usuário/ }).click();
}
