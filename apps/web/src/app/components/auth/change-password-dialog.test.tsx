import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { changePasswordAction } from "@/app/actions/session";
import { ChangePasswordDialog } from "./change-password-dialog";

vi.mock("@/app/actions/session", () => ({ changePasswordAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
const action = vi.mocked(changePasswordAction);

async function fillAndSubmit(onOpenChange = vi.fn()) {
  const user = userEvent.setup();
  render(<ChangePasswordDialog open onOpenChange={onOpenChange} />);
  await user.type(screen.getByLabelText("Senha atual"), "Atual-1!a");
  await user.type(screen.getByLabelText("Nova senha"), "Nova-Senha9");
  await user.type(screen.getByLabelText("Confirmar nova senha"), "Nova-Senha9");
  await user.click(screen.getByRole("button", { name: "Trocar senha" }));
  return { user, onOpenChange };
}

describe("ChangePasswordDialog", () => {
  beforeEach(() => {
    action.mockReset();
    vi.mocked(toast.success).mockReset();
  });

  it("mostra a regra da senha antes de digitar e põe o foco na senha atual", () => {
    render(<ChangePasswordDialog open onOpenChange={() => {}} />);
    expect(screen.getByRole("dialog", { name: "Trocar senha" })).toBeInTheDocument();
    expect(screen.getByText("Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo.")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toHaveFocus();
  });

  it("envia os três campos", async () => {
    action.mockResolvedValue({ status: "idle" });
    await fillAndSubmit();
    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({
      senhaAtual: "Atual-1!a",
      novaSenha: "Nova-Senha9",
      confirmacao: "Nova-Senha9",
    });
  });

  it("mostra 'Senha atual incorreta.' no campo da senha atual", async () => {
    action.mockResolvedValue({ status: "error", fieldErrors: { senhaAtual: "Senha atual incorreta." } });
    await fillAndSubmit();
    expect(await screen.findByText("Senha atual incorreta.")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha atual")).toBeInvalid();
  });

  it("mostra exatamente as regras que faltaram e as senhas diferentes", async () => {
    action.mockResolvedValue({
      status: "error",
      fieldErrors: { novaSenha: "Falta: um número e um símbolo.", confirmacao: "As senhas não são iguais." },
    });
    await fillAndSubmit();
    expect(await screen.findByText("Falta: um número e um símbolo.")).toBeInTheDocument();
    expect(screen.getByText("As senhas não são iguais.")).toBeInTheDocument();
  });

  it("mostra o erro geral quando a API não responde", async () => {
    action.mockResolvedValue({ status: "error", general: "Não foi possível trocar a senha. Confira sua conexão e tente de novo." });
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível trocar a senha.");
  });

  it("na conclusão, fecha o diálogo e avisa 'Senha trocada'", async () => {
    action.mockResolvedValue({ status: "success" });
    const { onOpenChange } = await fillAndSubmit();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast.success).toHaveBeenCalledWith("Senha trocada", { description: "Você saiu dos outros navegadores." });
  });

  it("Cancelar fecha o diálogo", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ChangePasswordDialog open onOpenChange={onOpenChange} />);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
