import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Copy, Pencil } from "lucide-react";
import { MessageActions, type MessageAction } from "./message-actions";

function setup(items: MessageAction[]) {
  const user = userEvent.setup();
  const view = render(<MessageActions items={items} />);
  return { user, ...view };
}
const copy = (onSelect = vi.fn()): MessageAction => ({ id: "copy", label: "Copiar texto", icon: Copy, onSelect });
const edit = (onSelect = vi.fn()): MessageAction => ({ id: "edit", label: "Editar", icon: Pencil, onSelect });

describe("MessageActions", () => {
  it("é uma barra de ferramentas com um botão por ação e o menu Mais ações", () => {
    setup([copy(), edit()]);
    const toolbar = screen.getByRole("toolbar", { name: "Ações da mensagem" });
    expect(within(toolbar).getByRole("button", { name: "Copiar texto" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(within(toolbar).getByRole("button", { name: "Mais ações" })).toBeInTheDocument();
  });

  it("não aparece quando não há ação (mensagem apagada)", () => {
    const { container } = setup([]);
    expect(container).toBeEmptyDOMElement();
  });

  it("o botão da barra executa a ação", async () => {
    const onSelect = vi.fn();
    const { user } = setup([copy(onSelect)]);
    await user.click(screen.getByRole("button", { name: "Copiar texto" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("Mais ações abre o menu com todas as ações e anuncia cada uma como item de menu", async () => {
    const { user } = setup([copy(), edit()]);
    await user.click(screen.getByRole("button", { name: "Mais ações" }));
    const menu = await screen.findByRole("menu");
    expect(within(menu).getAllByRole("menuitem").map((item) => item.textContent)).toEqual(["Copiar texto", "Editar"]);
  });

  it("o menu abre e funciona só pelo teclado: Enter abre, setas escolhem, Enter executa e fecha", async () => {
    const onSelect = vi.fn();
    const { user } = setup([edit(), copy(onSelect)]);
    screen.getByRole("button", { name: "Mais ações" }).focus();
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("Esc fecha o menu e devolve o foco ao botão", async () => {
    const { user } = setup([copy()]);
    await user.click(screen.getByRole("button", { name: "Mais ações" }));
    await screen.findByRole("menu");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mais ações" })).toHaveFocus();
  });

  it("aceita ações novas sem mudar as que já existem: a ordem de entrada é a do menu e a da barra", async () => {
    const { user } = setup([copy(), edit(), { id: "delete", label: "Apagar", icon: Pencil, tone: "danger", onSelect: vi.fn() }]);
    const toolbar = screen.getByRole("toolbar");
    expect(within(toolbar).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Copiar texto", "Editar", "Apagar", "Mais ações"]);
    await user.click(screen.getByRole("button", { name: "Mais ações" }));
    expect(within(await screen.findByRole("menu")).getAllByRole("menuitem").map((i) => i.textContent)).toEqual(["Copiar texto", "Editar", "Apagar"]);
  });

  it("a ação que não é rápida só aparece no menu", async () => {
    const { user } = setup([copy(), { ...edit(), quick: false }]);
    expect(within(screen.getByRole("toolbar")).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Mais ações" }));
    expect(within(await screen.findByRole("menu")).getByRole("menuitem", { name: "Editar" })).toBeInTheDocument();
  });
});
