import type { ChatEvent, ChatMessage } from "chat-events";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { deleteMessageAction, editMessageAction, markReadAction, sendMessageAction } from "@/app/actions/conversations";
import { fetchMessagePage } from "@/lib/reading";
import { ConversationPane } from "./conversation-pane";

type Handler = (event: ChatEvent) => void;
const handlers: Record<string, Handler> = {};
const unsubscribe = vi.fn();
const sendTyping = vi.fn();

vi.mock("@/lib/realtime/realtime", () => ({
  getRealtimeClient: () => ({
    subscribe: (type: string, callback: Handler) => {
      handlers[type] = callback;
      return unsubscribe;
    },
    sendTyping,
  }),
}));
vi.mock("@/app/actions/conversations", () => ({ sendMessageAction: vi.fn(), editMessageAction: vi.fn(), deleteMessageAction: vi.fn(), markReadAction: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("@/lib/reading", async (original) => ({ ...(await original<typeof import("@/lib/reading")>()), fetchMessagePage: vi.fn() }));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const read = vi.mocked(markReadAction);
const fetchPage = vi.mocked(fetchMessagePage);

const message = (id: string, texto: string, conversa = "c1", criadaEm = "2026-11-24T10:00:00.000Z", autorId = "p1"): ChatMessage => ({
  id,
  conversa_id: conversa,
  autor: { id: autorId, nome: "Ana", usuario: "ana" },
  texto,
  criada_em: criadaEm,
  mencoes: [], citacao: null, editada_em: null, apagada: false,
});

const created = (m: ChatMessage) =>
  ({
    id: `e-${m.id}`,
    tipo: "mensagem_criada",
    momento: m.criada_em,
    dados: { conversa_id: m.conversa_id, mensagem: m, contagens: { nao_lidas: 1, mencoes: 0 } },
  }) as ChatEvent;

const typing = (usuario: string, id: string, conversa = "c1") =>
  ({ id: `ao_vivo-1-${id}`, tipo: "digitando", momento: "agora", dados: { conversa_id: conversa, pessoa: { id, usuario } } }) as ChatEvent;

const pane = (initial: ChatMessage[], hasMore = false) => (
  <ConversationPane
    conversationId="c1"
    placeholder="Mensagem para #geral"
    initialMessages={initial}
    initialHasMore={hasMore}
    intro={<p>Escreva a primeira mensagem</p>}
  />
);

const setVisibility = (state: "visible" | "hidden") =>
  Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });

describe("ConversationPane: exclusão", () => {
  const delAction = vi.mocked(deleteMessageAction);
  const mine = (n: number, over: Partial<ChatMessage> = {}): ChatMessage => ({ ...message(`m${n}`, `texto ${n}`, "c1", `2026-11-24T10:0${n}:00.000Z`), ...over });
  const deletedOf = (m: ChatMessage): ChatMessage => ({ ...m, texto: "", mencoes: [], citacao: null, apagada: true });
  const deletable = (initial: ChatMessage[]) => (
    <ConversationPane conversationId="c1" placeholder="Mensagem para #geral" initialMessages={initial} initialHasMore={false} intro={null} currentMemberId="p1" />
  );
  const deletedEvent = (id: string, conversa = "c1") =>
    ({ id: `e-del-${id}`, tipo: "mensagem_apagada", momento: "agora", dados: { conversa_id: conversa, mensagem_id: id } }) as ChatEvent;
  const askToDelete = async (user: ReturnType<typeof userEvent.setup>, index = 0) => {
    await user.click(screen.getAllByRole("button", { name: "Mais ações" })[index]!);
    await user.click(await screen.findByRole("menuitem", { name: "Apagar" }));
  };

  beforeEach(() => {
    for (const key of Object.keys(handlers)) delete handlers[key];
    delAction.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-24T10:30:00.000Z"));
    setVisibility("visible");
  });
  afterEach(() => vi.useRealTimers());

  it("Apagar pede confirmação com o trecho da mensagem, e Cancelar fecha sem apagar", async () => {
    const user = userEvent.setup();
    render(deletable([mine(1)]));
    await askToDelete(user);
    const dialog = screen.getByRole("alertdialog", { name: "Apagar mensagem?" });
    expect(dialog).toHaveTextContent("texto 1");
    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(delAction).not.toHaveBeenCalled();
    expect(screen.getByText("texto 1")).toBeInTheDocument();
  });

  it("confirmar apaga: a mensagem vira \"Mensagem apagada\", sem texto nem barra de ações, e o diálogo fecha", async () => {
    const original = mine(1);
    delAction.mockResolvedValue({ status: "deleted", message: deletedOf(original) });
    const user = userEvent.setup();
    render(deletable([original]));
    await askToDelete(user);
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(delAction).toHaveBeenCalledWith("c1", "m1");
    expect(await screen.findByText("Mensagem apagada")).toBeInTheDocument();
    expect(screen.queryByText("texto 1")).not.toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Ações da mensagem" })).not.toBeInTheDocument();
  });

  it("o erro da API aparece no diálogo, que continua aberto, e a mensagem fica como estava", async () => {
    delAction.mockResolvedValue({ status: "error", message: "O prazo de 4 horas para apagar esta mensagem acabou." });
    const user = userEvent.setup();
    render(deletable([mine(1)]));
    await askToDelete(user);
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("O prazo de 4 horas para apagar");
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(within(screen.getByRole("log")).getByText("texto 1")).toBeInTheDocument();
  });

  it("a exclusão de outra pessoa chega pelo tempo real e troca a mensagem por \"Mensagem apagada\"", () => {
    render(deletable([mine(1, { autor: { id: "p2", nome: "Bia", usuario: "bia" } }), mine(2)]));
    act(() => handlers.mensagem_apagada!(deletedEvent("m1")));
    expect(screen.getByText("Mensagem apagada")).toBeInTheDocument();
    expect(screen.queryByText("texto 1")).not.toBeInTheDocument();
    expect(screen.getByText("texto 2")).toBeInTheDocument();
  });

  it("a mesma exclusão entregue duas vezes (resposta e evento) não estraga a tela", async () => {
    const original = mine(1);
    delAction.mockResolvedValue({ status: "deleted", message: deletedOf(original) });
    const user = userEvent.setup();
    render(deletable([original, mine(2)]));
    await askToDelete(user);
    await user.click(screen.getByRole("button", { name: "Apagar" }));
    act(() => handlers.mensagem_apagada!(deletedEvent("m1")));
    act(() => handlers.mensagem_apagada!(deletedEvent("m1")));
    expect(await screen.findAllByText("Mensagem apagada")).toHaveLength(1);
    expect(screen.getByText("texto 2")).toBeInTheDocument();
  });

  it("evento de outra conversa, ou de mensagem que não está carregada, não faz nada", () => {
    render(deletable([mine(1)]));
    act(() => handlers.mensagem_apagada!(deletedEvent("m1", "c2")));
    act(() => handlers.mensagem_apagada!(deletedEvent("m9")));
    expect(screen.getByText("texto 1")).toBeInTheDocument();
    expect(screen.queryByText("Mensagem apagada")).not.toBeInTheDocument();
  });

  it("a citação carregada à apagada mostra \"Mensagem apagada\", sem o trecho, e deixa de ser um link", () => {
    const original = mine(1, { autor: { id: "p2", nome: "Bia", usuario: "bia" } });
    const reply = mine(2, { citacao: { id: "m1", autor: original.autor, trecho: "texto 1", apagada: false } });
    render(deletable([original, reply]));
    expect(screen.getByRole("button", { name: /Ir para a mensagem de Bia/ })).toBeInTheDocument();
    act(() => handlers.mensagem_apagada!(deletedEvent("m1")));
    expect(screen.queryByRole("button", { name: /Ir para a mensagem de Bia/ })).not.toBeInTheDocument();
    expect(screen.getAllByText("Mensagem apagada").length).toBeGreaterThanOrEqual(1);
  });

  it("se a mensagem que está sendo citada é apagada, a citação sai do campo", async () => {
    const user = userEvent.setup();
    const other = mine(1, { autor: { id: "p2", nome: "Bia", usuario: "bia" } });
    render(deletable([other]));
    await user.click(screen.getByRole("button", { name: "Citar" }));
    expect(screen.getByRole("group", { name: "Citação" })).toBeInTheDocument();
    act(() => handlers.mensagem_apagada!(deletedEvent("m1")));
    expect(screen.queryByRole("group", { name: "Citação" })).not.toBeInTheDocument();
  });

  it("se a mensagem que está sendo editada é apagada, o editor fecha", async () => {
    const user = userEvent.setup();
    render(deletable([mine(1)]));
    await user.click(screen.getByRole("button", { name: "Editar" }));
    expect(screen.getByRole("textbox", { name: "Editar mensagem" })).toBeInTheDocument();
    act(() => handlers.mensagem_apagada!(deletedEvent("m1")));
    expect(screen.queryByRole("textbox", { name: "Editar mensagem" })).not.toBeInTheDocument();
    expect(screen.getByText("Mensagem apagada")).toBeInTheDocument();
  });
});

describe("ConversationPane: edição", () => {
  const editAction = vi.mocked(editMessageAction);
  const mine = (n: number, over: Partial<ChatMessage> = {}): ChatMessage => ({ ...message(`m${n}`, `texto ${n}`, "c1", `2026-11-24T10:0${n}:00.000Z`), ...over });
  const editedOf = (m: ChatMessage, texto: string): ChatMessage => ({ ...m, texto, editada_em: "2026-11-24T10:20:00.000Z" });
  const editablePane = (initial: ChatMessage[]) => (
    <ConversationPane conversationId="c1" placeholder="Mensagem para #geral" initialMessages={initial} initialHasMore={false} intro={null} currentMemberId="p1" />
  );
  const editEvent = (m: ChatMessage, conversa = "c1") =>
    ({ id: `e-edit-${m.id}`, tipo: "mensagem_editada", momento: "agora", dados: { conversa_id: conversa, mensagem: m } }) as ChatEvent;

  beforeEach(() => {
    for (const key of Object.keys(handlers)) delete handlers[key];
    editAction.mockReset();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-24T10:30:00.000Z"));
    setVisibility("visible");
  });
  afterEach(() => vi.useRealTimers());

  it("Editar abre o editor no lugar da mensagem; salvar troca o texto, marca (editada) e fecha o editor", async () => {
    const original = mine(1);
    editAction.mockResolvedValue({ status: "edited", message: editedOf(original, "texto corrigido") });
    const user = userEvent.setup();
    render(editablePane([original]));
    await user.click(screen.getByRole("button", { name: "Editar" }));
    const field = screen.getByRole("textbox", { name: "Editar mensagem" });
    await user.clear(field);
    await user.type(field, "texto corrigido{Enter}");
    expect(editAction).toHaveBeenCalledWith("c1", "m1", "texto corrigido");
    expect(await screen.findByText(/texto corrigido/)).toBeInTheDocument();
    expect(screen.getByText("(editada)")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Editar mensagem" })).not.toBeInTheDocument();
  });

  it("Esc cancela a edição sem chamar a API, e só uma mensagem fica em edição por vez", async () => {
    const user = userEvent.setup();
    render(editablePane([mine(1), mine(2)]));
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]!);
    expect(screen.getAllByRole("textbox", { name: "Editar mensagem" })).toHaveLength(1);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: "Editar mensagem" })).not.toBeInTheDocument();
    expect(editAction).not.toHaveBeenCalled();
  });

  it("o erro da API aparece no editor, que continua aberto com o texto", async () => {
    editAction.mockResolvedValue({ status: "error", message: "O prazo de 4 horas para editar esta mensagem acabou." });
    const user = userEvent.setup();
    render(editablePane([mine(1)]));
    await user.click(screen.getByRole("button", { name: "Editar" }));
    await user.type(screen.getByRole("textbox", { name: "Editar mensagem" }), "!{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("O prazo de 4 horas");
    expect(screen.getByRole("textbox", { name: "Editar mensagem" })).toHaveValue("texto 1!");
  });

  it("a edição de outra pessoa chega pelo tempo real e troca o texto, sem recarregar", () => {
    const original = mine(1, { autor: { id: "p2", nome: "Bia", usuario: "bia" } });
    render(editablePane([original]));
    act(() => handlers.mensagem_editada!(editEvent(editedOf(original, "texto da Bia, corrigido"))));
    expect(screen.getByText(/texto da Bia, corrigido/)).toBeInTheDocument();
    expect(screen.getByText("(editada)")).toBeInTheDocument();
  });

  it("a mesma edição entregue duas vezes (resposta e evento) não duplica nem estraga a tela", async () => {
    const original = mine(1);
    const edited = editedOf(original, "texto corrigido");
    editAction.mockResolvedValue({ status: "edited", message: edited });
    const user = userEvent.setup();
    render(editablePane([original, mine(2)]));
    await user.click(screen.getAllByRole("button", { name: "Editar" })[0]!);
    await user.type(screen.getByRole("textbox", { name: "Editar mensagem" }), "{Enter}");
    await user.type(screen.getByRole("textbox", { name: "Editar mensagem" }), "x{Enter}");
    act(() => handlers.mensagem_editada!(editEvent(edited)));
    act(() => handlers.mensagem_editada!(editEvent(edited)));
    expect(screen.getAllByText(/texto corrigido/)).toHaveLength(1);
    expect(screen.getByText("texto 2")).toBeInTheDocument();
    expect(screen.getAllByText("(editada)")).toHaveLength(1);
  });

  it("evento de outra conversa, ou de uma mensagem que não está carregada, não faz nada", () => {
    render(editablePane([mine(1)]));
    act(() => handlers.mensagem_editada!(editEvent(editedOf(mine(1), "outra conversa"), "c2")));
    act(() => handlers.mensagem_editada!(editEvent(editedOf(mine(9), "não carregada"))));
    expect(screen.getByText("texto 1")).toBeInTheDocument();
    expect(screen.queryByText(/outra conversa|não carregada/)).not.toBeInTheDocument();
    expect(screen.queryByText("(editada)")).not.toBeInTheDocument();
  });

  it("a citação carregada a uma mensagem que foi editada passa a mostrar o texto novo", () => {
    const original = mine(1, { autor: { id: "p2", nome: "Bia", usuario: "bia" } });
    const reply = mine(2, { citacao: { id: "m1", autor: original.autor, trecho: "texto 1", apagada: false } });
    render(editablePane([original, reply]));
    act(() => handlers.mensagem_editada!(editEvent(editedOf(original, "texto 1, revisado"))));
    expect(screen.getByRole("button", { name: /Ir para a mensagem de Bia/ })).toHaveTextContent("texto 1, revisado");
  });
});

describe("ConversationPane: citação", () => {
  const scrollIntoView = vi.fn();
  const at = (n: number, extra: Partial<ChatMessage> = {}) =>
    message(`m${n}`, `texto ${n}`, "c1", `2026-11-24T10:0${n}:00.000Z`, "p1") && { ...message(`m${n}`, `texto ${n}`, "c1", `2026-11-24T10:0${n}:00.000Z`), ...extra };
  const quoteOf = (id: string) => ({ id, autor: { id: "p1", nome: "Ana", usuario: "ana" }, trecho: `texto ${id.slice(1)}`, apagada: false });
  const sendAction = vi.mocked(sendMessageAction);

  beforeEach(() => {
    for (const key of Object.keys(handlers)) delete handlers[key];
    fetchPage.mockReset();
    scrollIntoView.mockReset();
    sendAction.mockReset();
    vi.mocked(toast.error).mockClear();
    Element.prototype.scrollIntoView = scrollIntoView;
    setVisibility("visible");
  });

  it("Citar mostra o contexto sobre o campo, o envio leva o citacao_id e a citação some depois de enviar", async () => {
    const user = userEvent.setup();
    const sentMessage = at(2, { citacao: quoteOf("m1"), texto: "resposta" });
    sendAction.mockResolvedValue({ status: "sent", message: sentMessage });
    render(pane([at(1)]));
    await user.click(screen.getByRole("button", { name: "Citar" }));
    expect(screen.getByRole("group", { name: "Citação" })).toHaveTextContent("Citando Ana");
    await user.type(screen.getByRole("textbox", { name: "Mensagem para #geral" }), "resposta{Enter}");
    expect(Object.fromEntries(sendAction.mock.calls[0]![2])).toEqual({ texto: "resposta", citacao_id: "m1" });
    expect(await screen.findByText("resposta")).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Citação" })).not.toBeInTheDocument();
  });

  it("cancelar tira a citação, e uma nova escolha troca a anterior", async () => {
    const user = userEvent.setup();
    render(pane([at(1), at(2)]));
    await user.click(screen.getAllByRole("button", { name: "Citar" })[0]!);
    await user.click(screen.getByRole("button", { name: "Cancelar citação" }));
    expect(screen.queryByRole("group", { name: "Citação" })).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Citar" })[0]!);
    await user.click(screen.getAllByRole("button", { name: "Citar" })[1]!);
    expect(screen.getAllByRole("group", { name: "Citação" })).toHaveLength(1);
    expect(screen.getByRole("group", { name: "Citação" })).toHaveTextContent("texto 2");
  });

  it("clicar na citação de uma mensagem já carregada rola até ela, sem buscar nada", async () => {
    render(pane([at(1), at(2, { citacao: quoteOf("m1") })]));
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem de Ana/ }));
    expect(fetchPage).not.toHaveBeenCalled();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("mensagem-m1"));
  });

  it("se a original não está carregada, carrega o histórico página a página até achá-la e rola até ela", async () => {
    fetchPage
      .mockResolvedValueOnce({ mensagens: [at(3), at(4)], tem_mais: true })
      .mockResolvedValueOnce({ mensagens: [at(1), at(2)], tem_mais: false });
    render(pane([at(5, { citacao: quoteOf("m1") })], true));
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem de Ana/ }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(fetchPage.mock.calls.map((call) => call[1])).toEqual(["m5", "m3"]);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById("mensagem-m1"));
  });

  it("para ao achar a original, sem puxar as páginas seguintes", async () => {
    fetchPage.mockResolvedValueOnce({ mensagens: [at(1), at(2), at(3), at(4)], tem_mais: true });
    render(pane([at(5, { citacao: quoteOf("m2") })], true));
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem de Ana/ }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledTimes(1));
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("uma página vazia com tem_mais não prende a busca: para e avisa", async () => {
    fetchPage.mockResolvedValue({ mensagens: [], tem_mais: true });
    render(pane([at(5, { citacao: quoteOf("m1") })], true));
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem de Ana/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível encontrar a mensagem citada"));
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("depois de rolar até a original, o foco vai para ela", async () => {
    render(pane([at(1), at(2, { citacao: quoteOf("m1") })]));
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem de Ana/ }));
    expect(document.getElementById("mensagem-m1")).toHaveFocus();
  });

  it("avisa quando o histórico acaba sem a original, ou quando a busca falha", async () => {
    fetchPage.mockResolvedValueOnce({ mensagens: [at(3), at(4)], tem_mais: false });
    const { unmount } = render(pane([at(5, { citacao: quoteOf("m1") })], true));
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem de Ana/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível encontrar a mensagem citada"));
    expect(scrollIntoView).not.toHaveBeenCalled();
    unmount();

    vi.mocked(toast.error).mockClear();
    fetchPage.mockRejectedValueOnce(new Error("rede"));
    render(pane([at(5, { citacao: quoteOf("m1") })], true));
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem de Ana/ }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Não foi possível encontrar a mensagem citada"));
  });
});

describe("ConversationPane", () => {
  beforeEach(() => {
    for (const key of Object.keys(handlers)) delete handlers[key];
    unsubscribe.mockReset();
    sendTyping.mockReset();
    read.mockClear();
    fetchPage.mockReset();
    setVisibility("visible");
  });
  afterEach(() => vi.useRealTimers());

  describe("mensagens", () => {
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
      act(() => handlers.mensagem_criada!(created(message("m2", "chegou agora", "c1", "2026-11-24T10:05:00.000Z"))));
      expect(screen.getByText("chegou agora")).toBeInTheDocument();
      expect(screen.getByText("primeira")).toBeInTheDocument();
    });

    it("não repete a mensagem que o tempo real entrega de novo", () => {
      render(pane([message("m1", "primeira")]));
      act(() => handlers.mensagem_criada!(created(message("m1", "primeira"))));
      expect(screen.getAllByText("primeira")).toHaveLength(1);
    });

    it("ignora a mensagem de outra conversa", () => {
      render(pane([message("m1", "primeira")]));
      act(() => handlers.mensagem_criada!(created(message("m9", "de outra conversa", "c2"))));
      expect(screen.queryByText("de outra conversa")).not.toBeInTheDocument();
    });

    it("junta com o que já está na tela quando o servidor relê a conversa", () => {
      const { rerender } = render(pane([message("m1", "primeira")]));
      act(() => handlers.mensagem_criada!(created(message("m2", "pelo tempo real", "c1", "2026-11-24T10:02:00.000Z"))));
      rerender(pane([message("m1", "primeira"), message("m3", "do servidor", "c1", "2026-11-24T10:03:00.000Z")]));
      expect(screen.getByText("primeira")).toBeInTheDocument();
      expect(screen.getByText("pelo tempo real")).toBeInTheDocument();
      expect(screen.getByText("do servidor")).toBeInTheDocument();
    });

    it("cancela as inscrições ao sair da conversa", () => {
      const { unmount } = render(pane([]));
      unmount();
      expect(unsubscribe).toHaveBeenCalledTimes(4);
    });
  });

  describe("digitando", () => {
    it("uma pessoa: @usuário está digitando; várias: Há N pessoas digitando...", () => {
      render(pane([message("m1", "primeira")]));
      act(() => handlers.digitando!(typing("bia", "p2")));
      expect(screen.getByText("@bia está digitando")).toBeInTheDocument();
      act(() => handlers.digitando!(typing("caio", "p3")));
      expect(screen.getByText("Há 2 pessoas digitando...")).toBeInTheDocument();
    });

    it("ignora o digitando de outra conversa", () => {
      render(pane([message("m1", "primeira")]));
      act(() => handlers.digitando!(typing("bia", "p2", "c2")));
      expect(screen.queryByText(/digitando/)).not.toBeInTheDocument();
    });

    it("o aviso some em 5 segundos sem novo evento", () => {
      vi.useFakeTimers();
      render(pane([message("m1", "primeira")]));
      act(() => handlers.digitando!(typing("bia", "p2")));
      act(() => void vi.advanceTimersByTime(4000));
      expect(screen.getByText("@bia está digitando")).toBeInTheDocument();
      act(() => void vi.advanceTimersByTime(2000));
      expect(screen.queryByText(/digitando/)).not.toBeInTheDocument();
    });

    it("o aviso some quando chega a mensagem do mesmo autor", () => {
      render(pane([message("m1", "primeira")]));
      act(() => handlers.digitando!(typing("bia", "p2")));
      act(() => handlers.mensagem_criada!(created(message("m2", "pronto", "c1", "2026-11-24T10:05:00.000Z", "p2"))));
      expect(screen.queryByText(/digitando/)).not.toBeInTheDocument();
    });
  });

  describe("leitura", () => {
    it("lê até a última mensagem carregada, depois de uma espera curta, com a aba visível e a rolagem no fim", () => {
      vi.useFakeTimers();
      render(pane([message("m1", "primeira"), message("m2", "segunda", "c1", "2026-11-24T10:01:00.000Z")]));
      expect(read).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(500));
      expect(read).toHaveBeenCalledTimes(1);
      expect(read).toHaveBeenCalledWith("c1", "m2");
    });

    it("junta mensagens seguidas numa leitura só, até a última", () => {
      vi.useFakeTimers();
      render(pane([message("m1", "primeira")]));
      act(() => void vi.advanceTimersByTime(100));
      act(() => handlers.mensagem_criada!(created(message("m2", "b", "c1", "2026-11-24T10:01:00.000Z"))));
      act(() => handlers.mensagem_criada!(created(message("m3", "c", "c1", "2026-11-24T10:02:00.000Z"))));
      act(() => void vi.advanceTimersByTime(500));
      expect(read).toHaveBeenCalledTimes(1);
      expect(read).toHaveBeenCalledWith("c1", "m3");
    });

    it("não lê com a aba escondida e lê quando ela volta a ficar visível", () => {
      vi.useFakeTimers();
      setVisibility("hidden");
      render(pane([message("m1", "primeira")]));
      act(() => void vi.advanceTimersByTime(1000));
      expect(read).not.toHaveBeenCalled();
      setVisibility("visible");
      act(() => void document.dispatchEvent(new Event("visibilitychange")));
      act(() => void vi.advanceTimersByTime(500));
      expect(read).toHaveBeenCalledWith("c1", "m1");
    });

    it("não lê conversa sem mensagens", () => {
      vi.useFakeTimers();
      render(pane([]));
      act(() => void vi.advanceTimersByTime(1000));
      expect(read).not.toHaveBeenCalled();
    });
  });

  describe("histórico", () => {
    it("carrega a página anterior pela âncora da mensagem mais antiga e mostra Início da conversa ao acabar", async () => {
      fetchPage.mockResolvedValue({ mensagens: [message("m0", "mais antiga", "c1", "2026-11-24T09:00:00.000Z")], tem_mais: false });
      render(pane([message("m1", "primeira")], true));
      await userEvent.click(screen.getByRole("button", { name: "Carregar mensagens anteriores" }));
      expect(fetchPage).toHaveBeenCalledWith("c1", "m1");
      expect(await screen.findByText("mais antiga")).toBeInTheDocument();
      expect(screen.getByText("Início da conversa")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Carregar mensagens anteriores" })).not.toBeInTheDocument();
    });

    it("mostra a falha e tenta de novo", async () => {
      fetchPage.mockRejectedValueOnce(new Error("rede"));
      render(pane([message("m1", "primeira")], true));
      await userEvent.click(screen.getByRole("button", { name: "Carregar mensagens anteriores" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar as mensagens anteriores");
      fetchPage.mockResolvedValueOnce({ mensagens: [message("m0", "mais antiga", "c1", "2026-11-24T09:00:00.000Z")], tem_mais: true });
      await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
      expect(await screen.findByText("mais antiga")).toBeInTheDocument();
      expect(fetchPage).toHaveBeenCalledTimes(2);
    });

    it("não repete mensagem que a página traz e já estava na tela", async () => {
      fetchPage.mockResolvedValue({ mensagens: [message("m1", "primeira"), message("m0", "mais antiga", "c1", "2026-11-24T09:00:00.000Z")], tem_mais: true });
      render(pane([message("m1", "primeira")], true));
      await userEvent.click(screen.getByRole("button", { name: "Carregar mensagens anteriores" }));
      await screen.findByText("mais antiga");
      expect(screen.getAllByText("primeira")).toHaveLength(1);
    });
  });

  describe("campo de mensagem", () => {
    it("avisa que a pessoa digita, no máximo uma vez a cada 3 segundos", async () => {
      let now = 1_000_000;
      const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
      const user = userEvent.setup();
      render(pane([message("m1", "primeira")]));
      const field = screen.getByRole("textbox", { name: "Mensagem para #geral" });
      await user.type(field, "ol");
      expect(sendTyping).toHaveBeenCalledTimes(1);
      expect(sendTyping).toHaveBeenCalledWith("c1");
      now += 2999;
      await user.type(field, "x");
      expect(sendTyping).toHaveBeenCalledTimes(1);
      now += 1;
      await user.type(field, "á");
      expect(sendTyping).toHaveBeenCalledTimes(2);
      clock.mockRestore();
    });

    it("depois de enviar a mensagem, o próximo digitando não espera o intervalo", async () => {
      const now = 1_000_000;
      const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
      vi.mocked(sendMessageAction).mockResolvedValue({ status: "sent", message: message("m2", "oi", "c1", "2026-11-24T10:05:00.000Z") });
      const user = userEvent.setup();
      render(pane([message("m1", "primeira")]));
      const field = screen.getByRole("textbox", { name: "Mensagem para #geral" });
      await user.type(field, "oi{Enter}");
      await screen.findByText("oi");
      expect(sendTyping).toHaveBeenCalledTimes(1);
      await user.type(field, "n");
      expect(sendTyping).toHaveBeenCalledTimes(2);
      clock.mockRestore();
    });

    it("não avisa sem texto", async () => {
      const user = userEvent.setup();
      render(pane([message("m1", "primeira")]));
      const field = screen.getByRole("textbox", { name: "Mensagem para #geral" });
      await user.type(field, "   ");
      expect(sendTyping).not.toHaveBeenCalled();
    });
  });
});
