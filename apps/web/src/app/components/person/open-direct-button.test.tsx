import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDirectAction } from "@/app/actions/conversations";
import { OpenDirectButton } from "./open-direct-button";

vi.mock("@/app/actions/conversations", () => ({ openDirectAction: vi.fn() }));
const action = vi.mocked(openDirectAction);

const ID = "0192f4a0-0000-7000-8000-000000000001";

describe("OpenDirectButton", () => {
  beforeEach(() => action.mockReset());

  it("abre a conversa direta com a pessoa, pela mesma ação da busca", async () => {
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    render(<OpenDirectButton personId={ID} />);
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ membroId: ID });
  });

  it("abre pelo teclado", async () => {
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    render(<OpenDirectButton personId={ID} />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("desabilita o botão e avisa enquanto a conversa abre", async () => {
    let finish!: (value: { status: "idle" }) => void;
    action.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<OpenDirectButton personId={ID} />);
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(await screen.findByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
    // Libera a ação: uma transição que nunca termina seguraria as dos testes seguintes.
    finish({ status: "idle" });
    await waitFor(() => expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled());
  });

  it("mostra o erro quando a conversa não abre", async () => {
    action.mockResolvedValue({ status: "error", message: "Não foi possível abrir a conversa. Tente de novo." });
    const user = userEvent.setup();
    render(<OpenDirectButton personId={ID} />);
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir a conversa");
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
  });
});
