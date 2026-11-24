import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageEditor } from "./message-editor";

function setup(props: Partial<React.ComponentProps<typeof MessageEditor>> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const user = userEvent.setup();
  render(<MessageEditor initial="texto antigo" onSave={onSave} onCancel={onCancel} {...props} />);
  return { user, onSave, onCancel, field: screen.getByRole("textbox", { name: "Editar mensagem" }), save: () => screen.getByRole("button", { name: "Salvar" }) };
}

describe("MessageEditor", () => {
  it("abre com o texto atual, em foco, e a dica de teclas", () => {
    const { field } = setup();
    expect(field).toHaveValue("texto antigo");
    expect(field).toHaveFocus();
    expect(screen.getByText(/salva/)).toBeInTheDocument();
    expect(screen.getByText(/cancela/)).toBeInTheDocument();
  });

  it("Enter salva o texto novo, sem as pontas, e Shift+Enter quebra a linha", async () => {
    const { user, onSave, field } = setup();
    await user.clear(field);
    await user.type(field, "linha 1{Shift>}{Enter}{/Shift}linha 2");
    expect(onSave).not.toHaveBeenCalled();
    expect(field).toHaveValue("linha 1\nlinha 2");
    await user.keyboard("{Enter}");
    expect(onSave).toHaveBeenCalledWith("linha 1\nlinha 2");
  });

  it("o botão Salvar também salva", async () => {
    const { user, onSave, field, save } = setup();
    await user.type(field, " mais");
    await user.click(save());
    expect(onSave).toHaveBeenCalledWith("texto antigo mais");
  });

  it("Esc e o botão Cancelar cancelam, sem salvar", async () => {
    const { user, onSave, onCancel, field } = setup();
    await user.type(field, "x{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onSave).not.toHaveBeenCalled();
  });

  it("Salvar fica desabilitado com o texto vazio, só de espaços ou igual ao atual, e Enter não salva", async () => {
    const { user, onSave, field, save } = setup();
    expect(save()).toBeDisabled();
    await user.type(field, "   ");
    expect(save()).toBeDisabled();
    await user.clear(field);
    expect(save()).toBeDisabled();
    await user.type(field, "  texto antigo  ");
    expect(save()).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(onSave).not.toHaveBeenCalled();
    await user.type(field, "!");
    expect(save()).toBeEnabled();
  });

  it("acima de 4.000 caracteres avisa e desabilita; com 4.000 salva", async () => {
    const { user, field, save } = setup({ initial: "oi" });
    await user.clear(field);
    await user.click(field);
    await user.paste("x".repeat(4001));
    expect(save()).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("A mensagem passa de 4.000 caracteres");
    await user.keyboard("{Backspace}");
    expect(save()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra o erro da API sobre os botões, ligado ao campo", () => {
    const { field } = setup({ error: "O prazo de 4 horas para editar esta mensagem acabou." });
    expect(screen.getByRole("alert")).toHaveTextContent("O prazo de 4 horas para editar esta mensagem acabou.");
    expect(field).toHaveAttribute("aria-invalid", "true");
  });

  it("enquanto salva, trava o campo e os botões e não salva duas vezes", async () => {
    const { user, onSave, field } = setup({ pending: true });
    expect(field).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(onSave).not.toHaveBeenCalled();
  });
});
