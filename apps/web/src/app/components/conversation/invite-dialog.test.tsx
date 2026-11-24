import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { inviteAction } from "@/app/actions/conversations";
import { InviteDialog } from "./invite-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/app/actions/conversations", () => ({ inviteAction: vi.fn() }));
const action = vi.mocked(inviteAction);

const CANDIDATES = [
  { id: "0192f4a0-0000-7000-8000-000000000001", nome: "Leonan Luppi" },
  { id: "0192f4a0-0000-7000-8000-000000000002", nome: "Luiz Carlos" },
  { id: "0192f4a0-0000-7000-8000-000000000003", nome: "Wesley Willians" },
];

/** O botão da linha da pessoa, e não o "Tirar" do chip. */
const row = (name: string) => screen.getByRole("button", { name });

function open(candidates = CANDIDATES, onOpenChange = vi.fn()) {
  render(<InviteDialog open onOpenChange={onOpenChange} conversationId="c1" channelName="diretoria" candidates={candidates} />);
  return onOpenChange;
}

describe("InviteDialog", () => {
  beforeEach(() => {
    action.mockReset();
    refresh.mockReset();
  });

  it("lista só quem pode ser convidado, pelo nome, e começa sem ninguém escolhido", () => {
    open();
    expect(screen.getByRole("dialog", { name: "Convidar para #diretoria" })).toBeInTheDocument();
    for (const member of CANDIDATES) expect(row(member.nome)).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "Convidar" })).toBeDisabled();
  });

  it("escolhe e tira pessoas, mostrando quem foi escolhido", async () => {
    const user = userEvent.setup();
    open();
    await user.click(row("Leonan Luppi"));
    await user.click(row("Wesley Willians"));
    const chosen = screen.getByRole("list", { name: "Escolhidas" });
    expect(chosen).toHaveTextContent("Leonan Luppi");
    expect(chosen).toHaveTextContent("Wesley Willians");
    expect(screen.getByRole("button", { name: "Convidar" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Tirar Leonan Luppi" }));
    expect(screen.getByRole("list", { name: "Escolhidas" })).not.toHaveTextContent("Leonan Luppi");
  });

  it("envia os ids escolhidos e fecha o diálogo no sucesso", async () => {
    action.mockResolvedValue({ status: "success", participantes: [] });
    const user = userEvent.setup();
    const onOpenChange = open();
    await user.click(row("Leonan Luppi"));
    await user.click(row("Luiz Carlos"));
    await user.click(screen.getByRole("button", { name: "Convidar" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0]![0]).toBe("c1");
    expect(action.mock.calls[0]![2].getAll("membroId")).toEqual([CANDIDATES[0]!.id, CANDIDATES[1]!.id]);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(refresh).toHaveBeenCalled();
  });

  it("mostra a falha, mantém as escolhas e não fecha", async () => {
    action.mockResolvedValue({ status: "error", message: "Não foi possível convidar as pessoas. Tente de novo." });
    const user = userEvent.setup();
    const onOpenChange = open();
    await user.click(row("Leonan Luppi"));
    await user.click(screen.getByRole("button", { name: "Convidar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível convidar as pessoas");
    expect(row("Leonan Luppi")).toHaveAttribute("aria-pressed", "true");
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("avisa quando todas as pessoas já participam e não deixa convidar", () => {
    open([]);
    expect(screen.getByText("Todas as pessoas do workspace já participam deste canal.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Convidar" })).toBeDisabled();
  });

  it("escolhe e envia só pelo teclado", async () => {
    action.mockResolvedValue({ status: "success", participantes: [] });
    const user = userEvent.setup();
    open();
    expect(row("Leonan Luppi")).toHaveFocus();
    await user.keyboard(" ");
    for (let i = 0; i < 10 && document.activeElement !== screen.getByRole("button", { name: "Convidar" }); i++) await user.tab();
    expect(screen.getByRole("button", { name: "Convidar" })).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(action.mock.calls[0]![2].getAll("membroId")).toEqual([CANDIDATES[0]!.id]);
  });
});
