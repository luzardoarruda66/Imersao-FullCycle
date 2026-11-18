import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { signInAction } from "@/app/actions/session";
import { LoginForm } from "./login-form";

vi.mock("@/app/actions/session", () => ({ signInAction: vi.fn() }));
const action = vi.mocked(signInAction);

async function submit(email = "ana@empresa.com", senha = "segredo") {
  const user = userEvent.setup();
  render(<LoginForm para="/c/1" />);
  if (email) await user.type(screen.getByLabelText("E-mail"), email);
  if (senha) await user.type(screen.getByLabelText("Senha"), senha);
  await user.click(screen.getByRole("button", { name: "Entrar" }));
}

describe("LoginForm", () => {
  beforeEach(() => action.mockReset());

  it("envia e-mail, senha e o destino guardado", async () => {
    action.mockResolvedValue({ status: "idle" });
    await submit();
    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]![1];
    expect(Object.fromEntries(data)).toEqual({ email: "ana@empresa.com", senha: "segredo", para: "/c/1" });
  });

  it("envia com Enter, só pelo teclado", async () => {
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    render(<LoginForm para="/" />);
    await user.type(screen.getByLabelText("E-mail"), "ana@empresa.com");
    await user.type(screen.getByLabelText("Senha"), "segredo{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("mostra o erro de cada campo, anunciado, e marca o campo como inválido", async () => {
    action.mockResolvedValue({
      status: "error",
      kind: "validacao",
      email: "ana@",
      fieldErrors: { email: "Informe um e-mail válido, como nome@empresa.com.", senha: "Informe sua senha." },
    });
    await submit("ana@", "");
    expect(await screen.findByText("Informe sua senha.")).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText("E-mail")).toBeInvalid();
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@");
    expect(screen.getByLabelText("Senha")).toBeInvalid();
  });

  it("mostra credenciais incorretas no campo da senha, sem dizer qual dado errou", async () => {
    action.mockResolvedValue({ status: "error", kind: "credenciais", email: "ana@empresa.com" });
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos. Confira os dados e tente de novo.");
    expect(screen.getByLabelText("E-mail")).toBeValid();
  });

  it("diz quanto tempo falta quando houve tentativas demais", async () => {
    action.mockResolvedValue({ status: "error", kind: "tentativas", email: "ana@empresa.com", segundosRestantes: 840 });
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Muitas tentativas de entrar. Aguarde 14 minutos e tente de novo.");
  });

  it("mostra a falha de envio quando a API não responde", async () => {
    action.mockResolvedValue({ status: "error", kind: "falha", email: "ana@empresa.com" });
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível entrar agora. Confira sua conexão e tente de novo.");
  });

  it("desabilita o botão enquanto o envio está em andamento", async () => {
    let finish!: () => void;
    action.mockReturnValue(new Promise((resolve) => (finish = () => resolve({ status: "idle" }))));
    await submit();
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled());
  });
});
