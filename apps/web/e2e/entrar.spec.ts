import AxeBuilder from "@axe-core/playwright";
import { account, expect, openUserMenu, signIn, test } from "./fixtures";

test.describe("Entrar", () => {
  test("link guardado: sem sessão cai em Entrar e volta ao link depois de entrar", async ({ page }) => {
    await page.goto("/conversa/42?mensagem=7");
    await expect(page).toHaveURL(/\/entrar\?para=%2Fconversa%2F42%3Fmensagem%3D7$/);
    await expect(page.getByRole("heading", { name: "Entrar no Full Cycle" })).toBeVisible();
    const { email, password } = account("link");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill(password);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL("/conversa/42?mensagem=7");
  });

  test("destino externo é recusado: entra e cai na tela principal", async ({ page }) => {
    await signIn(page, account("link"), "/entrar?para=//outro-site.example");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("button", { name: /Menu do usuário/ })).toBeVisible();
  });

  test("validação na própria tela e credenciais incorretas", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("Informe um e-mail válido, como nome@empresa.com.")).toBeVisible();
    await expect(page.getByText("Informe sua senha.")).toBeVisible();

    await page.getByLabel("E-mail").fill(account("link").email);
    await page.getByLabel("Senha").fill("senha-errada");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.getByText("E-mail ou senha incorretos. Confira os dados e tente de novo.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toHaveValue(account("link").email);
  });

  test("depois de 5 erros seguidos mostra tentativas demais e quanto falta", async ({ page }) => {
    const email = `bloqueio-${Date.now()}@fullcycle.dev`;
    for (let i = 0; i < 5; i++) {
      await page.goto("/entrar");
      await page.getByLabel("E-mail").fill(email);
      await page.getByLabel("Senha").fill("errada");
      await page.getByRole("button", { name: "Entrar" }).click();
      await expect(page.getByRole("alert").first()).toBeVisible();
    }
    await expect(page.getByText("Muitas tentativas de entrar. Aguarde 15 minutos e tente de novo.")).toBeVisible();
  });

  test("usa só o teclado, enviando com Enter", async ({ page }) => {
    const { email, password } = account("link");
    await page.goto("/entrar");
    // O foco já começa no e-mail.
    await expect(page.getByLabel("E-mail")).toBeFocused();
    await page.keyboard.type(email);
    await page.keyboard.press("Tab");
    await page.keyboard.type(password);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL("/");
  });

  test("a tela segue o tema do sistema operacional", async ({ page }) => {
    const surface = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--surface").trim());
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/entrar");
    expect(["#fff", "#ffffff"]).toContain(await surface());
    await page.emulateMedia({ colorScheme: "dark" });
    expect(await surface()).toBe("#1a1d21");
  });

  test("não tem violações de acessibilidade (axe), nos dois temas", async ({ page }) => {
    for (const colorScheme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme });
      await page.goto("/entrar");
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations, JSON.stringify(results.violations.map((v) => v.id))).toEqual([]);
    }
  });
});

test.describe("Sessão e abas", () => {
  test("uma aba nova no mesmo navegador já abre com a sessão", async ({ page, context }) => {
    await signIn(page, account("abas"));
    await expect(page).toHaveURL("/");
    const second = await context.newPage();
    await second.goto("/");
    await expect(second).toHaveURL("/");
    await expect(second.getByRole("button", { name: /Menu do usuário/ })).toBeVisible();
  });

  test("com a sessão aberta, Entrar leva direto à tela principal", async ({ page }) => {
    await signIn(page, account("abas"));
    await page.goto("/entrar");
    await expect(page).toHaveURL("/");
  });

  test("sair no menu derruba a outra aba na próxima ação", async ({ page, context }) => {
    await signIn(page, account("sair"));
    const second = await context.newPage();
    await second.goto("/");
    await expect(second.getByRole("button", { name: /Menu do usuário/ })).toBeVisible();

    await openUserMenu(page);
    await page.getByRole("menuitem", { name: "Sair do Full Cycle" }).click();
    await expect(page).toHaveURL(/\/entrar/);

    await second.reload();
    await expect(second).toHaveURL(/\/entrar/);
  });

  test("cookie que a API não reconhece é apagado, sem laço entre as telas", async ({ page, context }) => {
    await context.addCookies([{ name: "sid", value: "lixo", url: "http://localhost:3000" }]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/entrar/);
    await expect(page.getByRole("heading", { name: "Entrar no Full Cycle" })).toBeVisible();
    expect((await context.cookies()).find((cookie) => cookie.name === "sid")).toBeUndefined();
  });

  test("o cookie da sessão não é legível pelo código da página", async ({ page }) => {
    await signIn(page, account("abas"));
    await expect(page).toHaveURL("/");
    expect(await page.evaluate(() => document.cookie)).not.toContain("sid");
  });
});

test.describe("Trocar a senha", () => {
  test("erros de campo, senha atual incorreta e troca concluída só pelo teclado", async ({ page, browser }) => {
    const acc = account("senha");
    await signIn(page, acc);
    await expect(page).toHaveURL("/");

    // Outro navegador, que a troca deve derrubar.
    const other = await browser.newContext({ baseURL: "http://localhost:3000", extraHTTPHeaders: { "x-forwarded-for": "10.9.9.9" } });
    const otherPage = await other.newPage();
    await signIn(otherPage, acc);
    await expect(otherPage).toHaveURL("/");

    await openUserMenu(page);
    await page.getByRole("menuitem", { name: "Trocar senha" }).click();
    const dialog = page.getByRole("dialog", { name: "Trocar senha" });
    await expect(dialog.getByLabel("Senha atual")).toBeFocused();
    await expect(dialog.getByText("Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo.")).toBeVisible();

    // Confirmação diferente e regras faltando.
    await dialog.getByLabel("Senha atual").fill(acc.password);
    await dialog.getByLabel("Nova senha", { exact: true }).fill("abcdefgh");
    await dialog.getByLabel("Confirmar nova senha").fill("outra");
    await dialog.getByRole("button", { name: "Trocar senha" }).click();
    await expect(dialog.getByText("As senhas não são iguais.")).toBeVisible();
    await dialog.getByLabel("Confirmar nova senha").fill("abcdefgh");
    await dialog.getByRole("button", { name: "Trocar senha" }).click();
    await expect(dialog.getByText("Falta: uma letra maiúscula, um número e um símbolo.")).toBeVisible();

    // Senha atual incorreta.
    await dialog.getByLabel("Senha atual").fill("errada-Errada1!");
    await dialog.getByLabel("Nova senha", { exact: true }).fill("Nova-Senha-9x");
    await dialog.getByLabel("Confirmar nova senha").fill("Nova-Senha-9x");
    await dialog.getByRole("button", { name: "Trocar senha" }).click();
    await expect(dialog.getByText("Senha atual incorreta.")).toBeVisible();

    // Troca concluída, enviando com Enter.
    await dialog.getByLabel("Senha atual").fill(acc.password);
    await dialog.getByLabel("Confirmar nova senha").press("Enter");
    await expect(page.getByText("Senha trocada", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Você saiu dos outros navegadores.").first()).toBeVisible();
    await expect(dialog).toBeHidden();

    // A sessão deste navegador continua; a do outro caiu.
    await page.reload();
    await expect(page).toHaveURL("/");
    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/entrar/);
    await other.close();
  });
});
