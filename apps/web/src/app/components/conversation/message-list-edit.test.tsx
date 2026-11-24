import type { ChatMessage } from "chat-events";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EDIT_WINDOW_MS } from "@/lib/messages";
import { MessageList } from "./message-list";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const NOW = new Date(2026, 10, 24, 12, 0).getTime();
const msg = (over: Partial<ChatMessage> = {}): ChatMessage => ({
  id: "m1",
  conversa_id: "c1",
  autor: { id: "p1", nome: "Ana", usuario: "ana" },
  texto: "Fechado, sigo com o roteiro.",
  criada_em: new Date(NOW - 60_000).toISOString(),
  mencoes: [],
  citacao: null,
  editada_em: null,
  apagada: false,
  ...over,
});
const render1 = (message: ChatMessage, props: Partial<React.ComponentProps<typeof MessageList>> = {}) =>
  render(<MessageList messages={[message]} intro={null} currentMemberId="p1" onEdit={() => {}} {...props} />);

describe("MessageList: editar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("Editar aparece só no que é do membro, dentro das 4 horas, e não na apagada", () => {
    const { unmount } = render1(msg());
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    unmount();
    render1(msg({ autor: { id: "p2", nome: "Bia", usuario: "bia" } }));
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("o prazo vale até 4 horas depois do envio", () => {
    const at4h = render1(msg({ criada_em: new Date(NOW - EDIT_WINDOW_MS).toISOString() }));
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    at4h.unmount();
    render1(msg({ criada_em: new Date(NOW - EDIT_WINDOW_MS - 1000).toISOString() }));
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("sem quem trate a edição, ou sem saber quem é o membro, a ação não aparece; e na apagada nunca", () => {
    const a = render1(msg(), { onEdit: undefined });
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    a.unmount();
    const b = render1(msg(), { currentMemberId: undefined });
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    b.unmount();
    render1(msg({ apagada: true, texto: "" }));
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("Citar, Copiar texto e Editar ficam nessa ordem, e Editar entrega a mensagem, também pelo teclado", async () => {
    const onEdit = vi.fn();
    const message = msg();
    render1(message, { onEdit, onQuote: () => {} });
    const names = [...screen.getByRole("group", { name: "Ações da mensagem" }).querySelectorAll("button")].map((b) => b.getAttribute("aria-label"));
    expect(names).toEqual(["Citar", "Copiar texto", "Editar", "Mais ações"]);
    screen.getByRole("button", { name: "Editar" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onEdit).toHaveBeenCalledWith(message);
  });

  it("mostra \"(editada)\" na mensagem editada, com o texto, e nada na que não foi", () => {
    const edited = render1(msg({ editada_em: new Date(NOW).toISOString(), texto: "texto novo" }));
    expect(screen.getByText("(editada)")).toBeInTheDocument();
    expect(screen.getByText(/texto novo/)).toBeInTheDocument();
    edited.unmount();
    render1(msg());
    expect(screen.queryByText("(editada)")).not.toBeInTheDocument();
  });

  it("a mensagem em edição mostra o editor no lugar do texto, com os handlers", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    render1(msg(), { editing: { messageId: "m1", pending: false, onSave, onCancel } });
    const field = screen.getByRole("textbox", { name: "Editar mensagem" });
    expect(field).toHaveValue("Fechado, sigo com o roteiro.");
    expect(screen.queryByText("Fechado, sigo com o roteiro.", { selector: "p" })).not.toBeInTheDocument();
    await userEvent.type(field, " ok{Enter}");
    expect(onSave).toHaveBeenCalledWith("Fechado, sigo com o roteiro. ok");
    await userEvent.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalled();
  });

  it("enquanto edita, a barra de ações da mensagem some", () => {
    render1(msg(), { editing: { messageId: "m1", pending: false, onSave: () => {}, onCancel: () => {} } });
    expect(screen.queryByRole("group", { name: "Ações da mensagem" })).not.toBeInTheDocument();
  });

  it("o erro da edição aparece no editor", () => {
    render1(msg(), { editing: { messageId: "m1", pending: false, error: "Esta mensagem foi apagada.", onSave: () => {}, onCancel: () => {} } });
    expect(screen.getByRole("alert")).toHaveTextContent("Esta mensagem foi apagada.");
  });
});
