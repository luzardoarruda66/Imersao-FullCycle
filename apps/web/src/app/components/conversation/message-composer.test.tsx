import type { ChatMessage } from "chat-events";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { sendMessageAction } from "@/app/actions/conversations";
import { MessageComposer } from "./message-composer";

vi.mock("@/app/actions/conversations", () => ({ sendMessageAction: vi.fn() }));
const action = vi.mocked(sendMessageAction);

const sent: ChatMessage = {
  id: "m1",
  conversa_id: "c1",
  autor: { id: "p1", nome: "Ana", usuario: "ana" },
  texto: "oi",
  criada_em: "2026-11-24T10:00:00.000Z",
};

const PLACEHOLDER = "Mensagem para #geral";

function setup() {
  const onSent = vi.fn();
  const user = userEvent.setup();
  render(<MessageComposer conversationId="c1" placeholder={PLACEHOLDER} onSent={onSent} />);
  return { user, onSent, field: screen.getByRole("textbox", { name: PLACEHOLDER }) };
}

describe("MessageComposer", () => {
  beforeEach(() => action.mockReset());

  it("envia com Enter, entrega a mensagem gravada e limpa o campo", async () => {
    action.mockResolvedValue({ status: "sent", message: sent });
    const { user, onSent, field } = setup();
    await user.type(field, "oi{Enter}");
    await waitFor(() => expect(onSent).toHaveBeenCalledWith(sent));
    expect(action).toHaveBeenCalledTimes(1);
    expect(action.mock.calls[0]![0]).toBe("c1");
    expect(Object.fromEntries(action.mock.calls[0]![2])).toEqual({ texto: "oi" });
    await waitFor(() => expect(field).toHaveValue(""));
  });

  it("quebra a linha com Shift+Enter, sem enviar", async () => {
    const { user, field } = setup();
    await user.type(field, "linha 1{Shift>}{Enter}{/Shift}linha 2");
    expect(field).toHaveValue("linha 1\nlinha 2");
    expect(action).not.toHaveBeenCalled();
  });

  it("não envia mensagem vazia nem só de espaços, e o botão fica desabilitado", async () => {
    const { user, field } = setup();
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
    await user.type(field, "   {Enter}");
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
  });

  it("envia pelo botão", async () => {
    action.mockResolvedValue({ status: "sent", message: sent });
    const { user, field } = setup();
    await user.type(field, "oi");
    await user.click(screen.getByRole("button", { name: "Enviar mensagem" }));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });

  it("avisa que passou de 4.000 caracteres e não envia, com Enter nem pelo botão", async () => {
    const { user, field } = setup();
    await user.click(field);
    await user.paste("a".repeat(4001));
    expect(await screen.findByRole("alert")).toHaveTextContent("A mensagem passa de 4.000 caracteres");
    expect(field).toBeInvalid();
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeDisabled();
    await user.keyboard("{Enter}");
    expect(action).not.toHaveBeenCalled();
  });

  it("aceita exatamente 4.000 caracteres", async () => {
    const { user, field } = setup();
    await user.click(field);
    await user.paste("a".repeat(4000));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Enviar mensagem" })).toBeEnabled();
  });

  it("mostra a falha e mantém o texto quando o envio não chega à API", async () => {
    action.mockResolvedValue({ status: "error", message: "Não foi possível enviar a mensagem. Verifique a conexão e tente de novo. O texto foi mantido." });
    const { user, onSent, field } = setup();
    await user.type(field, "meu texto importante{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("O texto foi mantido");
    expect(field).toHaveValue("meu texto importante");
    expect(onSent).not.toHaveBeenCalled();
  });
});
