import AxeBuilder from "@axe-core/playwright";
import { account, createChannel, displayName, expect, openSession, test } from "./fixtures";

/** Um nome de canal por execução: o banco de desenvolvimento guarda os canais de uma rodada para a outra. */
const unique = (prefix: string) => `${prefix}-${Date.now().toString(36)}`;

test.describe("Canais e conversas diretas", () => {
  test("canal privado: o convite o faz aparecer para o convidado, ao vivo, e nunca para um terceiro", async ({ browser }) => {
    const name = unique("privado");
    const [ana, bia, caio] = await Promise.all([
      openSession(browser, account("canais-a")),
      openSession(browser, account("canais-b")),
      openSession(browser, account("canais-c")),
    ]);

    await createChannel(ana, name, "Privado");
    // Ninguém mais vê o canal privado recém-criado, nem Bia, que ainda não foi convidada.
    await expect(bia.getByRole("link", { name })).toHaveCount(0);

    await ana.getByRole("button", { name: /^Participantes, 1$/ }).click();
    await ana.getByRole("button", { name: "Convidar pessoas" }).click();
    // O convite não lista quem já participa (a própria Ana).
    await expect(ana.getByRole("button", { name: displayName("canais-a") })).toHaveCount(0);
    await ana.getByRole("button", { name: displayName("canais-b") }).click();
    await ana.getByRole("button", { name: "Convidar", exact: true }).click();

    // Sem recarregar: o evento do tempo real faz a lateral da convidada se atualizar.
    await expect(bia.getByRole("link", { name })).toBeVisible();
    await bia.getByRole("link", { name }).click();
    await expect(bia.getByRole("heading", { level: 1, name })).toBeVisible();

    // O terceiro não vê o canal na lista, nem pelo endereço: a tela é a de uma conversa que não existe.
    await caio.waitForTimeout(500);
    await expect(caio.getByRole("link", { name })).toHaveCount(0);
    const url = new URL(bia.url());
    await caio.goto(url.pathname);
    await expect(caio.getByRole("heading", { name: "Conversa não encontrada" })).toBeVisible();
    await caio.goto("/conversas/0192f4a0-0000-7000-8000-000000000000");
    await expect(caio.getByRole("heading", { name: "Conversa não encontrada" })).toBeVisible();

    await Promise.all([ana, bia, caio].map((page) => page.context().close()));
  });

  test("a mensagem de uma pessoa aparece na hora para a outra, sem recarregar", async ({ browser }) => {
    const name = unique("geral");
    const [ana, bia] = await Promise.all([openSession(browser, account("canais-a")), openSession(browser, account("canais-b"))]);

    await createChannel(ana, name, "Público");
    // O canal público novo entra na lateral de todos os membros ao vivo.
    await expect(bia.getByRole("link", { name })).toBeVisible();
    await bia.getByRole("link", { name }).click();
    await expect(bia.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(bia.getByText("Escreva a primeira mensagem para começar a conversa.")).toBeVisible();

    const text = `bom dia, ${name}`;
    await ana.getByRole("textbox", { name: `Mensagem para #${name}` }).fill(text);
    await ana.keyboard.press("Enter");
    // A própria mensagem aparece para quem enviou, e o campo esvazia.
    await expect(ana.getByRole("log", { name: "Mensagens" }).getByText(text)).toBeVisible();
    await expect(ana.getByRole("textbox", { name: `Mensagem para #${name}` })).toHaveValue("");

    const received = bia.getByRole("log", { name: "Mensagens" });
    await expect(received.getByText(text)).toBeVisible();
    await expect(received.getByText(displayName("canais-a"))).toBeVisible();
    await expect(received.getByText(/^\d{2}:\d{2}$/)).toBeVisible();

    await Promise.all([ana, bia].map((page) => page.context().close()));
  });

  test("conversa direta: abrir a conversa a mostra para os dois, e só para os dois", async ({ browser }) => {
    const [ana, bia, caio] = await Promise.all([
      openSession(browser, account("canais-a")),
      openSession(browser, account("canais-b")),
      openSession(browser, account("canais-c")),
    ]);

    await ana.getByRole("button", { name: "Nova conversa" }).last().click();
    // O seletor traz só o nome, e não o próprio membro.
    await expect(ana.getByRole("button", { name: displayName("canais-a") })).toHaveCount(0);
    await ana.getByRole("button", { name: displayName("canais-b") }).click();
    await expect(ana).toHaveURL(/\/conversas\/[0-9a-f-]+$/);
    await expect(ana.getByRole("heading", { level: 1, name: displayName("canais-b") })).toBeVisible();

    await expect(bia.getByRole("link", { name: displayName("canais-a") })).toBeVisible();
    await expect(caio.getByRole("link", { name: displayName("canais-a") })).toHaveCount(0);

    // Abrir de novo leva à mesma conversa.
    const url = ana.url();
    await ana.goto("/");
    await ana.getByRole("button", { name: "Nova conversa" }).last().click();
    await ana.getByRole("button", { name: displayName("canais-b") }).click();
    await expect(ana).toHaveURL(url);

    await Promise.all([ana, bia, caio].map((page) => page.context().close()));
  });

  test("navega a lista e envia uma mensagem usando só o teclado, sem falha de acessibilidade", async ({ browser }) => {
    const name = unique("teclado");
    const page = await openSession(browser, account("teclado"));
    await createChannel(page, name, "Público");
    await page.goto("/");

    // Tab até o canal na lateral, Enter para abrir.
    const link = page.getByRole("link", { name });
    for (let i = 0; i < 40 && !(await link.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();

    // Tab até o campo de mensagem, escreve e envia com Enter.
    const field = page.getByRole("textbox", { name: `Mensagem para #${name}` });
    for (let i = 0; i < 40 && !(await field.evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press("Tab");
    await expect(field).toBeFocused();
    await page.keyboard.type("mensagem só pelo teclado");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("log", { name: "Mensagens" }).getByText("mensagem só pelo teclado")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
    await page.context().close();
  });

  test("os diálogos de criar canal e de conversa direta não têm falha de acessibilidade", async ({ browser }) => {
    const page = await openSession(browser, account("teclado"));
    await page.getByRole("button", { name: "Adicionar canal" }).click();
    await expect(page.getByRole("dialog", { name: "Criar canal" })).toBeVisible();
    // Sem tipo escolhido: o envio mostra o erro do tipo.
    await page.getByLabel("Nome").fill("sem-tipo");
    await page.getByRole("button", { name: "Criar canal" }).click();
    await expect(page.getByText("Escolha se o canal é público ou privado.")).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Nova conversa" }).last().click();
    await expect(page.getByRole("dialog", { name: "Nova conversa" })).toBeVisible();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.context().close();
  });
});
