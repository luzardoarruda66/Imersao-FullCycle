import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { openDirectAction } from "@/app/actions/conversations";
import { NewDirectDialog } from "./new-direct-dialog";

vi.mock("@/app/actions/conversations", () => ({ openDirectAction: vi.fn() }));
const action = vi.mocked(openDirectAction);

const MEMBERS = [
  { id: "0192f4a0-0000-7000-8000-000000000001", nome: "Alfredo Luiz" },
  { id: "0192f4a0-0000-7000-8000-000000000002", nome: "Euller Cristian" },
];

const open = (members = MEMBERS) => render(<NewDirectDialog open onOpenChange={() => {}} members={members} />);

describe("NewDirectDialog", () => {
  beforeEach(() => action.mockReset());

  it("lista os membros só pelo nome, sem busca", () => {
    open();
    expect(screen.getByRole("dialog", { name: "Nova conversa" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Alfredo Luiz" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Euller Cristian" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("abre a conversa com o membro escolhido", async () => {
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Euller Cristian" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ membroId: MEMBERS[1]!.id });
  });

  it("escolhe o membro só pelo teclado", async () => {
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    open();
    expect(screen.getByRole("button", { name: "Alfredo Luiz" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ membroId: MEMBERS[0]!.id });
  });

  it("mostra o erro quando a conversa não abre", async () => {
    action.mockResolvedValue({ status: "error", message: "Não foi possível abrir a conversa. Tente de novo." });
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Alfredo Luiz" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir a conversa");
  });

  it("avisa quando não há outras pessoas", () => {
    open([]);
    expect(screen.getByText(/Não há outras pessoas/)).toBeInTheDocument();
  });
});
