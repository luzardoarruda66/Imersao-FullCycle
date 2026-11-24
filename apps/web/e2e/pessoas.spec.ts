import AxeBuilder from "@axe-core/playwright";
import { account, displayName, expect, openSession, test } from "./fixtures";
import type { Page } from "@playwright/test";

/** Violações de acessibilidade da tela aberta, com o que o axe achou, para a falha dizer onde está o problema. */
async function violationsOf(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.map((n) => n.html.slice(0, 140)) }));
}

const SEARCH = { name: "Buscar por nome ou @usuário" };
const results = (page: Page) => page.getByRole("list", { name: "Pessoas" });

test.describe("Pessoas e perfis", () => {
  test("busca por parte do @usuário e abre a conversa direta, só pelo teclado", async ({ browser }) => {
    const page = await openSession(browser, account("teclado"));
    await page.getByRole("button", { name: "Nova conversa" }).last().focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("searchbox", SEARCH)).toBeFocused();

    await page.keyboard.type("@e2e-canais-b");
    await expect(results(page).getByRole("button", { name: displayName("canais-b") })).toBeVisible();
    expect(await violationsOf(page)).toEqual([]);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/conversas\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: displayName("canais-b") })).toBeVisible();
    await page.context().close();
  });

  test("abre o Perfil pelo resultado, manda mensagem dali e volta, só pelo teclado, sem falha de acessibilidade", async ({ browser }) => {
    const page = await openSession(browser, account("teclado"));
    await page.getByRole("button", { name: "Nova conversa" }).last().focus();
    await page.keyboard.press("Enter");
    await page.keyboard.type("canais-b");
    await expect(results(page).getByRole("button", { name: displayName("canais-b") })).toBeVisible();

    // Do campo, o Tab chega ao botão do primeiro resultado e, depois, ao "Ver perfil" da mesma linha.
    await page.keyboard.press("Tab");
    await expect(results(page).getByRole("button", { name: displayName("canais-b") })).toBeFocused();
    await page.keyboard.press("Tab");
    const viewProfile = page.getByRole("link", { name: `Ver perfil de ${displayName("canais-b")}` });
    await expect(viewProfile).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/pessoas\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: "Perfil" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: displayName("canais-b") })).toBeVisible();
    await expect(page.getByText("@e2e-canais-b")).toBeVisible();
    // Cargo, telefone e status só passam a existir na F1-07: aqui nenhum está preenchido.
    await expect(page.getByText("Não informado")).toHaveCount(3);
    expect(await violationsOf(page)).toEqual([]);

    const profileUrl = page.url();
    await page.getByRole("button", { name: "Enviar mensagem" }).focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/conversas\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { level: 1, name: displayName("canais-b") })).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(profileUrl);
    await expect(page.getByRole("heading", { level: 1, name: "Perfil" })).toBeVisible();
    await page.context().close();
  });

  test("o Perfil de um endereço que não leva a ninguém mostra a tela de não encontrado, com o caminho de volta", async ({ browser }) => {
    const page = await openSession(browser, account("teclado"));
    for (const id of ["abc", "0192f4a0-0000-7000-8000-00000000dead"]) {
      await page.goto(`/pessoas/${id}`);
      await expect(page.getByRole("heading", { name: "Pessoa não encontrada" })).toBeVisible();
    }
    expect(await violationsOf(page)).toEqual([]);
    await page.getByRole("link", { name: "Voltar ao início" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.context().close();
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`a busca e o Perfil não têm falha de acessibilidade no tema ${scheme}`, async ({ browser }) => {
      const page = await openSession(browser, account("teclado"));
      await page.emulateMedia({ colorScheme: scheme });
      await page.getByRole("button", { name: "Nova conversa" }).last().click();
      await page.getByRole("searchbox", SEARCH).fill("canais-b");
      await expect(results(page).getByRole("button", { name: displayName("canais-b") })).toBeVisible();
      expect(await violationsOf(page)).toEqual([]);
      await page.getByRole("searchbox", SEARCH).fill("zzzz");
      await expect(page.getByRole("heading", { name: "Ninguém encontrado" })).toBeVisible();
      expect(await violationsOf(page)).toEqual([]);

      await page.getByRole("searchbox", SEARCH).fill("canais-b");
      await page.getByRole("link", { name: `Ver perfil de ${displayName("canais-b")}` }).click();
      await expect(page.getByRole("heading", { level: 2, name: displayName("canais-b") })).toBeVisible();
      expect(await violationsOf(page)).toEqual([]);
      await page.context().close();
    });
  }

  test("sem sessão, o Perfil leva a Entrar e guarda o endereço", async ({ page }) => {
    await page.goto("/pessoas/0192f4a0-0000-7000-8000-00000000dead");
    await expect(page).toHaveURL(/\/entrar\?para=%2Fpessoas%2F/);
  });
});
