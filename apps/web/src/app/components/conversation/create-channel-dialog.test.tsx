import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createChannelAction } from "@/app/actions/conversations";
import { CreateChannelDialog } from "./create-channel-dialog";

vi.mock("@/app/actions/conversations", () => ({ createChannelAction: vi.fn() }));
const action = vi.mocked(createChannelAction);

function open() {
  render(<CreateChannelDialog open onOpenChange={() => {}} />);
}

describe("CreateChannelDialog", () => {
  beforeEach(() => action.mockReset());

  it("abre sem tipo escolhido, com o foco no nome", () => {
    open();
    expect(screen.getByRole("dialog", { name: "Criar canal" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveFocus();
    expect(screen.getByRole("radio", { name: /Público/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /Privado/ })).not.toBeChecked();
  });

  it("envia o nome e o tipo escolhido", async () => {
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    open();
    await user.type(screen.getByLabelText("Nome"), "planejamento-q4");
    await user.click(screen.getByRole("radio", { name: /Privado/ }));
    await user.click(screen.getByRole("button", { name: "Criar canal" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ nome: "planejamento-q4", tipo: "privado" });
  });

  it("envia com Enter no campo do nome, depois de escolher o tipo pelo teclado", async () => {
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    open();
    await user.tab(); // do nome para a primeira opção
    await user.keyboard(" "); // Espaço escolhe "Público"
    await user.click(screen.getByLabelText("Nome"));
    await user.keyboard("geral{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ nome: "geral", tipo: "publico" });
  });

  it("move o foco entre as opções pelas setas do teclado", async () => {
    const user = userEvent.setup();
    open();
    await user.tab();
    expect(screen.getByRole("radio", { name: /Público/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /Privado/ })).toHaveFocus();
    // A escolha pela seta depende do navegador (o Radix a faz numa animação de quadro): o Playwright a cobre.
  });

  it("mostra o erro do nome e o do tipo, anunciados, e marca os campos como inválidos", async () => {
    action.mockResolvedValue({
      status: "error",
      fieldErrors: { nome: "Informe um nome de 1 a 80 caracteres.", tipo: "Escolha se o canal é público ou privado." },
    });
    const user = userEvent.setup();
    open();
    await user.click(screen.getByRole("button", { name: "Criar canal" }));
    expect(await screen.findByText("Informe um nome de 1 a 80 caracteres.")).toHaveAttribute("role", "alert");
    expect(screen.getByText("Escolha se o canal é público ou privado.")).toHaveAttribute("role", "alert");
    expect(screen.getByLabelText("Nome")).toBeInvalid();
    expect(screen.getByRole("radio", { name: /Público/ })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("radio", { name: /Privado/ })).toHaveAttribute("aria-invalid", "true");
  });

  it("mantém o que foi digitado quando a API recusa o nome", async () => {
    action.mockResolvedValue({ status: "error", fieldErrors: { nome: "Já existe um canal com esse nome." } });
    const user = userEvent.setup();
    open();
    await user.type(screen.getByLabelText("Nome"), "geral");
    await user.click(screen.getByRole("radio", { name: /Público/ }));
    await user.click(screen.getByRole("button", { name: "Criar canal" }));
    expect(await screen.findByText("Já existe um canal com esse nome.")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("geral");
    expect(screen.getByRole("radio", { name: /Público/ })).toBeChecked();
  });

  it("mostra a falha geral quando o envio não chega à API", async () => {
    action.mockResolvedValue({ status: "error", general: "Não foi possível criar o canal. Confira sua conexão e tente de novo." });
    const user = userEvent.setup();
    open();
    await user.type(screen.getByLabelText("Nome"), "geral");
    await user.click(screen.getByRole("radio", { name: /Público/ }));
    await user.click(screen.getByRole("button", { name: "Criar canal" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível criar o canal");
  });
});
