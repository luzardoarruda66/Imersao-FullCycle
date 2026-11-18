import { expect, test } from "./fixtures";

// Roda com a `chat-api` parada (scripts/e2e.sh): uma queda da API não tira ninguém da sessão.
test("API fora do ar: mostra 'Erro de sessão' com 'Tentar de novo', e não a tela de Entrar", async ({ page, context }) => {
  await context.addCookies([{ name: "sid", value: "qualquer", url: "http://localhost:3000" }]);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Não foi possível verificar sua sessão" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  await expect(page).toHaveURL("/");
  expect((await context.cookies()).some((cookie) => cookie.name === "sid")).toBe(true);
});
