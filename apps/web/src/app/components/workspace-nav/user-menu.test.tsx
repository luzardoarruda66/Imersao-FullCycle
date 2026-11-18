import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signOutAction } from "@/app/actions/session";
import { UserMenu } from "./user-menu";

vi.mock("@/app/actions/session", () => ({
  signOutAction: vi.fn(),
  changePasswordAction: vi.fn(),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

describe("UserMenu", () => {
  it("abre pelo avatar e mostra o nome, 'Trocar senha' e 'Sair do Full Cycle'", async () => {
    const user = userEvent.setup();
    render(<UserMenu name="Ana Souza" />);
    await user.click(screen.getByRole("button", { name: "Menu do usuário, Ana Souza" }));
    expect(await screen.findByText("Ana Souza")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Trocar senha" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Sair do Full Cycle" })).toBeInTheDocument();
  });

  it("abre o menu e sai só com o teclado", async () => {
    const user = userEvent.setup();
    render(<UserMenu name="Ana Souza" />);
    screen.getByRole("button", { name: /Menu do usuário/ }).focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await waitFor(() => expect(signOutAction).toHaveBeenCalled());
  });

  it("'Trocar senha' abre o diálogo sem sair da tela", async () => {
    const user = userEvent.setup();
    render(<UserMenu name="Ana Souza" />);
    await user.click(screen.getByRole("button", { name: /Menu do usuário/ }));
    await user.click(await screen.findByRole("menuitem", { name: "Trocar senha" }));
    expect(await screen.findByRole("dialog", { name: "Trocar senha" })).toBeInTheDocument();
  });
});
