import type { ChatMessage } from "chat-events";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sendMessageAction } from "@/app/actions/conversations";
import { MessageComposer } from "./message-composer";

vi.mock("@/app/actions/conversations", () => ({ sendMessageAction: vi.fn() }));
const action = vi.mocked(sendMessageAction);

const QUOTE_ID = "0192f4a0-0000-7000-8000-000000000001";
const quoted: ChatMessage = {
  id: QUOTE_ID,
  conversa_id: "c1",
  autor: { id: "p2", nome: "Regina Fonseca", usuario: "regina" },
  texto: "Alguém viu o aviso de acessibilidade no botão de enviar?",
  criada_em: "2026-11-24T10:00:00.000Z",
  mencoes: [],
  citacao: null,
  editada_em: null,
  apagada: false,
};
const PLACEHOLDER = "Mensagem para #geral";

function setup(quote: ChatMessage | null = quoted) {
  const onSent = vi.fn();
  const onCancelQuote = vi.fn();
  const user = userEvent.setup();
  const view = render(<MessageComposer conversationId="c1" placeholder={PLACEHOLDER} onSent={onSent} quote={quote} onCancelQuote={onCancelQuote} />);
  return { user, onSent, onCancelQuote, view, field: screen.getByRole("textbox", { name: PLACEHOLDER }) };
}

describe("MessageComposer: citação", () => {
  beforeEach(() => action.mockReset());

  it("mostra quem e o que está sendo citado sobre o campo", () => {
    setup();
    const context = screen.getByRole("group", { name: "Citação" });
    expect(within(context).getByText("Citando Regina Fonseca")).toBeInTheDocument();
    expect(within(context).getByText("Alguém viu o aviso de acessibilidade no botão de enviar?")).toBeInTheDocument();
  });

  it("não mostra nada sem citação", () => {
    setup(null);
    expect(screen.queryByRole("group", { name: "Citação" })).not.toBeInTheDocument();
  });

  it("corta o trecho citado em 140 caracteres", () => {
    setup({ ...quoted, texto: "x".repeat(200) });
    expect(screen.getByText(`${"x".repeat(140)}…`)).toBeInTheDocument();
  });

  it("leva o citacao_id no envio", async () => {
    action.mockResolvedValue({ status: "error", message: "x" });
    const { user, field } = setup();
    await user.type(field, "Vi sim{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![2])).toEqual({ texto: "Vi sim", citacao_id: QUOTE_ID });
  });

  it("sem citação, o envio não leva citacao_id", async () => {
    action.mockResolvedValue({ status: "error", message: "x" });
    const { user, field } = setup(null);
    await user.type(field, "oi{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![2])).toEqual({ texto: "oi" });
  });

  it("cancela a citação pelo botão, sem apagar o texto digitado", async () => {
    const { user, field, onCancelQuote } = setup();
    await user.type(field, "rascunho");
    await user.click(screen.getByRole("button", { name: "Cancelar citação" }));
    expect(onCancelQuote).toHaveBeenCalledTimes(1);
    expect(field).toHaveValue("rascunho");
  });

  it("o botão de cancelar é alcançável por teclado e Esc, com o campo em foco e sem lista de @, cancela", async () => {
    const { user, field, onCancelQuote } = setup();
    await user.click(field);
    await user.keyboard("{Escape}");
    expect(onCancelQuote).toHaveBeenCalledTimes(1);
  });

  it("foca o campo quando a citação aparece, para escrever em seguida", () => {
    const { view, field } = setup(null);
    expect(field).not.toHaveFocus();
    view.rerender(<MessageComposer conversationId="c1" placeholder={PLACEHOLDER} onSent={() => {}} quote={quoted} onCancelQuote={() => {}} />);
    expect(field).toHaveFocus();
  });

  it("depois de enviar, entrega a mensagem gravada (quem usa limpa a citação)", async () => {
    action.mockResolvedValue({ status: "sent", message: { ...quoted, id: "novo", citacao: { id: QUOTE_ID, autor: quoted.autor, trecho: "x", apagada: false } } });
    const { user, field, onSent } = setup();
    await user.type(field, "oi{Enter}");
    await waitFor(() => expect(onSent).toHaveBeenCalledTimes(1));
  });
});
