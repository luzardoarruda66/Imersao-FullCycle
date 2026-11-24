import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";

function setup(props: Partial<React.ComponentProps<typeof ConfirmDialog>> = {}) {
  const onConfirm = vi.fn();
  const onOpenChange = vi.fn();
  const user = userEvent.setup();
  render(
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title="Apagar mensagem?"
      description="Ela some da conversa para todo mundo. Não dá para desfazer."
      quote="Fechado, sigo com o roteiro da demo."
      confirmLabel="Apagar"
      tone="destructive"
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { user, onConfirm, onOpenChange };
}

describe("ConfirmDialog", () => {
  it("mostra título, descrição e o trecho, como diálogo de confirmação nomeado", () => {
    setup();
    const dialog = screen.getByRole("alertdialog", { name: "Apagar mensagem?" });
    expect(dialog).toHaveAccessibleDescription("Ela some da conversa para todo mundo. Não dá para desfazer.");
    expect(dialog).toHaveTextContent("Fechado, sigo com o roteiro da demo.");
  });

  it("o foco abre em Cancelar, o botão seguro", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cancelar" })).toHaveFocus();
  });

  it("confirmar chama onConfirm, e Cancelar ou Esc pedem para fechar", async () => {
    const { user, onConfirm, onOpenChange } = setup();
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    onOpenChange.mockClear();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("não fecha ao clicar fora", async () => {
    const { onOpenChange } = setup();
    // O Radix desliga o ponteiro fora do diálogo, então o clique de fora é disparado direto nos eventos.
    fireEvent.pointerDown(document.body);
    fireEvent.pointerUp(document.body);
    fireEvent.click(document.body);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("enquanto apaga, trava os botões, e o Esc não fecha", async () => {
    const { user, onConfirm, onOpenChange } = setup({ pending: true });
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Apagar" })).toBeDisabled();
    await user.keyboard("{Escape}");
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("mostra o erro, avisado, e os botões voltam a funcionar", () => {
    setup({ error: "O prazo de 4 horas para apagar esta mensagem acabou." });
    expect(screen.getByRole("alert")).toHaveTextContent("O prazo de 4 horas para apagar esta mensagem acabou.");
    expect(screen.getByRole("button", { name: "Apagar" })).toBeEnabled();
  });

  it("sem trecho, não mostra a caixa de citação", () => {
    setup({ quote: undefined });
    expect(screen.getByRole("alertdialog")).not.toHaveTextContent("Fechado");
  });
});
