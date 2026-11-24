import type { ChatEvent, ChatMessage } from "chat-events";
import { render, screen, act } from "@testing-library/react";
import { ConversationPane } from "./conversation-pane";

type Listener = (event: Extract<ChatEvent, { tipo: "mensagem_criada" }>) => void;
let listener: Listener | undefined;
const unsubscribe = vi.fn();

vi.mock("@/lib/realtime/realtime", () => ({
  getRealtimeClient: () => ({
    subscribe: (_type: string, callback: Listener) => {
      listener = callback;
      return unsubscribe;
    },
  }),
}));
vi.mock("@/app/actions/conversations", () => ({ sendMessageAction: vi.fn() }));

const message = (id: string, texto: string, conversa = "c1", criadaEm = "2026-11-24T10:00:00.000Z"): ChatMessage => ({
  id,
  conversa_id: conversa,
  autor: { id: "p1", nome: "Ana" },
  texto,
  criada_em: criadaEm,
});

const event = (m: ChatMessage) =>
  ({ id: `e-${m.id}`, tipo: "mensagem_criada", momento: m.criada_em, dados: { conversa_id: m.conversa_id, mensagem: m } }) as Extract<
    ChatEvent,
    { tipo: "mensagem_criada" }
  >;

const pane = (initial: ChatMessage[]) => (
  <ConversationPane conversationId="c1" placeholder="Mensagem para #geral" initialMessages={initial} intro={<p>Escreva a primeira mensagem</p>} />
);

describe("ConversationPane", () => {
  beforeEach(() => {
    listener = undefined;
    unsubscribe.mockReset();
  });

  it("mostra as mensagens lidas do servidor e o campo de envio", () => {
    render(pane([message("m1", "primeira"), message("m2", "segunda", "c1", "2026-11-24T10:01:00.000Z")]));
    expect(screen.getByText("primeira")).toBeInTheDocument();
    expect(screen.getByText("segunda")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Mensagem para #geral" })).toBeInTheDocument();
    expect(screen.queryByText("Escreva a primeira mensagem")).not.toBeInTheDocument();
  });

  it("mostra o convite a escrever quando a conversa está vazia", () => {
    render(pane([]));
    expect(screen.getByText("Escreva a primeira mensagem")).toBeInTheDocument();
  });

  it("acrescenta a mensagem que chega pelo tempo real, sem recarregar", () => {
    render(pane([message("m1", "primeira")]));
    act(() => listener!(event(message("m2", "chegou agora", "c1", "2026-11-24T10:05:00.000Z"))));
    expect(screen.getByText("chegou agora")).toBeInTheDocument();
    expect(screen.getByText("primeira")).toBeInTheDocument();
  });

  it("não repete a mensagem que o tempo real entrega de novo", () => {
    render(pane([message("m1", "primeira")]));
    act(() => listener!(event(message("m1", "primeira"))));
    expect(screen.getAllByText("primeira")).toHaveLength(1);
  });

  it("ignora a mensagem de outra conversa", () => {
    render(pane([message("m1", "primeira")]));
    act(() => listener!(event(message("m9", "de outra conversa", "c2"))));
    expect(screen.queryByText("de outra conversa")).not.toBeInTheDocument();
  });

  it("junta com o que já está na tela quando o servidor relê a conversa", () => {
    const { rerender } = render(pane([message("m1", "primeira")]));
    act(() => listener!(event(message("m2", "pelo tempo real", "c1", "2026-11-24T10:02:00.000Z"))));
    rerender(pane([message("m1", "primeira"), message("m3", "do servidor", "c1", "2026-11-24T10:03:00.000Z")]));
    expect(screen.getByText("primeira")).toBeInTheDocument();
    expect(screen.getByText("pelo tempo real")).toBeInTheDocument();
    expect(screen.getByText("do servidor")).toBeInTheDocument();
  });

  it("cancela a inscrição ao sair da conversa", () => {
    const { unmount } = render(pane([]));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
