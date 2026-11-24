import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { account, createChannel, expect, openSession, test } from "./fixtures";

/** Um nome de canal por execução: o banco de desenvolvimento guarda os canais de uma rodada para a outra. */
const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

async function send(page: Page, text: string) {
  const field = page.getByRole("textbox", { name: /^Mensagem para/ });
  await field.fill(text);
  await field.press("Enter");
  await expect(page.getByText(text, { exact: true })).toBeVisible();
}

test.describe("Tempo real e não lidas", () => {
  test("a mensagem aparece para a outra pessoa sem recarregar, com o 'digitando' e o selo de não lidas", async ({ browser }) => {
    const name = unique("tempo");
    const other = unique("outro");
    const [ana, bia] = await Promise.all([openSession(browser, account("tempo-a")), openSession(browser, account("tempo-b"))]);

    await createChannel(ana, name, "Público");
    await createChannel(ana, other, "Público");
    // Ana está no canal `other`; Bia abre o canal `name`: o canal `other` fica fechado para ela.
    await expect(bia.getByRole("link", { name: other })).toBeVisible();
    await bia.getByRole("link", { name }).click();
    await ana.getByRole("link", { name }).click();

    // 1. A mensagem de Ana chega para Bia, sem recarregar.
    await send(ana, "olá, Bia");
    await expect(bia.getByText("olá, Bia", { exact: true })).toBeVisible();

    // 2. Bia digita: Ana vê o aviso; quando Bia envia, o aviso some.
    await bia.getByRole("textbox", { name: /^Mensagem para/ }).fill("estou escrevendo");
    await expect(ana.getByText("@e2e-tempo-b está digitando")).toBeVisible();
    await bia.getByRole("textbox", { name: /^Mensagem para/ }).press("Enter");
    await expect(ana.getByText("@e2e-tempo-b está digitando")).toHaveCount(0);

    // 3. Mensagem num canal fechado: o selo aparece na lateral e some ao abrir.
    await ana.getByRole("link", { name: other }).click();
    await send(ana, "para quem está no outro canal");
    await expect(bia.getByRole("link", { name: `${other}, 1 não lida` })).toBeVisible();
    await bia.getByRole("link", { name: `${other}, 1 não lida` }).click();
    await expect(bia.getByRole("link", { name: other, exact: true })).toBeVisible();

    await Promise.all([ana, bia].map((page) => page.context().close()));
  });

  test("o histórico carrega por rolagem e por teclado até o Início da conversa", async ({ browser }) => {
    const name = unique("historico");
    const [ana, bia] = await Promise.all([openSession(browser, account("tempo-a")), openSession(browser, account("tempo-b"))]);

    await createChannel(ana, name, "Público");
    for (let i = 1; i <= 55; i++) await send(ana, `mensagem ${i}`);

    await bia.getByRole("link", { name: new RegExp(`^${name}`) }).click();
    await expect(bia.getByText("mensagem 55", { exact: true })).toBeVisible();
    // As 50 mais recentes: a 5 e as anteriores ainda não estão na tela.
    await expect(bia.getByText("mensagem 5", { exact: true })).toHaveCount(0);
    await expect(bia.getByText("Início da conversa")).toHaveCount(0);

    // Só pelo teclado: o botão carrega a página anterior.
    const older = bia.getByRole("button", { name: "Carregar mensagens anteriores" });
    await older.focus();
    await bia.keyboard.press("Enter");
    await expect(bia.getByText("mensagem 5", { exact: true })).toBeVisible();
    await expect(bia.getByText("Início da conversa")).toBeVisible();

    const results = await new AxeBuilder({ page: bia }).analyze();
    expect(results.violations).toEqual([]);

    await Promise.all([ana, bia].map((page) => page.context().close()));
  });
});
