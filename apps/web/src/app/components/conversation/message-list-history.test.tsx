import type { ChatMessage } from "chat-events";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageList } from "./message-list";

const msg = (id: string, minute: number): ChatMessage => ({
  id,
  conversa_id: "c1",
  autor: { id: "p1", nome: "Ana", usuario: "ana" },
  texto: id,
  criada_em: new Date(2026, 10, 24, 10, minute).toISOString(),
});

/** O jsdom não tem layout: o teste dá as medidas da rolagem à região de mensagens. */
function metrics(log: HTMLElement, { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  Object.defineProperty(log, "scrollHeight", { configurable: true, get: () => scrollHeight });
  Object.defineProperty(log, "clientHeight", { configurable: true, get: () => clientHeight });
  log.scrollTop = scrollTop;
}

const base = { intro: null, hasMore: false, loadingOlder: false, loadError: false, onLoadOlder: () => {}, onAtBottomChange: () => {} };

describe("MessageList: teclado", () => {
  it("a região de mensagens rola e por isso é alcançável pelo teclado", async () => {
    render(<MessageList {...base} messages={[msg("m1", 0)]} />);
    await userEvent.tab();
    expect(screen.getByRole("log", { name: "Mensagens" })).toHaveFocus();
  });
});

describe("MessageList: histórico", () => {
  it("mostra Início da conversa quando não há mais mensagens", () => {
    render(<MessageList {...base} messages={[msg("m1", 0)]} />);
    expect(screen.getByText("Início da conversa")).toBeInTheDocument();
  });

  it("não mostra Início da conversa enquanto há mais para carregar, e oferece o botão", async () => {
    const onLoadOlder = vi.fn();
    render(<MessageList {...base} hasMore messages={[msg("m1", 0)]} onLoadOlder={onLoadOlder} />);
    expect(screen.queryByText("Início da conversa")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Carregar mensagens anteriores" }));
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("mostra Carregando enquanto a página vem, sem o botão", () => {
    render(<MessageList {...base} hasMore loadingOlder messages={[msg("m1", 0)]} />);
    expect(screen.getByRole("status", { name: "Carregando mensagens anteriores" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Carregar mensagens anteriores" })).not.toBeInTheDocument();
  });

  it("mostra a falha com Tentar de novo", async () => {
    const onLoadOlder = vi.fn();
    render(<MessageList {...base} hasMore loadError messages={[msg("m1", 0)]} onLoadOlder={onLoadOlder} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar as mensagens anteriores");
    await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("pede a página anterior ao rolar até o começo", () => {
    const onLoadOlder = vi.fn();
    render(<MessageList {...base} hasMore messages={[msg("m1", 0)]} onLoadOlder={onLoadOlder} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 0 });
    fireEvent.scroll(log);
    expect(onLoadOlder).toHaveBeenCalledTimes(1);
  });

  it("não pede página ao rolar no meio, sem mais mensagens ou enquanto carrega", () => {
    const onLoadOlder = vi.fn();
    const { rerender } = render(<MessageList {...base} hasMore messages={[msg("m1", 0)]} onLoadOlder={onLoadOlder} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 800 });
    fireEvent.scroll(log);
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 0 });
    rerender(<MessageList {...base} hasMore={false} messages={[msg("m1", 0)]} onLoadOlder={onLoadOlder} />);
    fireEvent.scroll(log);
    rerender(<MessageList {...base} hasMore loadingOlder messages={[msg("m1", 0)]} onLoadOlder={onLoadOlder} />);
    fireEvent.scroll(log);
    expect(onLoadOlder).not.toHaveBeenCalled();
  });

  it("mantém a posição de leitura quando a página anterior chega", () => {
    const { rerender } = render(<MessageList {...base} hasMore messages={[msg("m5", 5)]} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 1000, clientHeight: 500, scrollTop: 10 });
    metrics(log, { scrollHeight: 1000, clientHeight: 500, scrollTop: 10 });
    rerender(<MessageList {...base} hasMore messages={[msg("m5", 5)]} loadingOlder />);
    Object.defineProperty(log, "scrollHeight", { configurable: true, get: () => 1600 });
    rerender(<MessageList {...base} hasMore messages={[msg("m1", 1), msg("m2", 2), msg("m5", 5)]} />);
    expect(log.scrollTop).toBe(610);
  });
});

describe("MessageList: mensagem nova", () => {
  it("avisa a rolagem: no fim e no meio", () => {
    const onAtBottomChange = vi.fn();
    render(<MessageList {...base} messages={[msg("m1", 0)]} onAtBottomChange={onAtBottomChange} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 100 });
    fireEvent.scroll(log);
    expect(onAtBottomChange).toHaveBeenLastCalledWith(false);
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
    fireEvent.scroll(log);
    expect(onAtBottomChange).toHaveBeenLastCalledWith(true);
  });

  it("segue no fim quando já estava no fim, sem aviso", () => {
    const { rerender } = render(<MessageList {...base} messages={[msg("m1", 0)]} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 1000, clientHeight: 500, scrollTop: 500 });
    fireEvent.scroll(log);
    Object.defineProperty(log, "scrollHeight", { configurable: true, get: () => 1100 });
    rerender(<MessageList {...base} messages={[msg("m1", 0), msg("m2", 1)]} />);
    expect(log.scrollTop).toBe(1100);
    expect(screen.queryByRole("button", { name: "Novas mensagens" })).not.toBeInTheDocument();
  });

  it("não pula a rolagem de quem lê o histórico e mostra Novas mensagens", () => {
    const { rerender } = render(<MessageList {...base} messages={[msg("m1", 0)]} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 300 });
    fireEvent.scroll(log);
    rerender(<MessageList {...base} messages={[msg("m1", 0), msg("m2", 1)]} />);
    expect(log.scrollTop).toBe(300);
    expect(screen.getByRole("button", { name: "Novas mensagens" })).toBeInTheDocument();
  });

  it("Novas mensagens leva ao fim, por clique ou teclado, e some", async () => {
    const { rerender } = render(<MessageList {...base} messages={[msg("m1", 0)]} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 300 });
    fireEvent.scroll(log);
    rerender(<MessageList {...base} messages={[msg("m1", 0), msg("m2", 1)]} />);
    screen.getByRole("button", { name: "Novas mensagens" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(log.scrollTop).toBe(2000);
    expect(screen.queryByRole("button", { name: "Novas mensagens" })).not.toBeInTheDocument();
  });

  it("some quando a rolagem volta ao fim por conta própria", () => {
    const { rerender } = render(<MessageList {...base} messages={[msg("m1", 0)]} />);
    const log = screen.getByRole("log", { name: "Mensagens" });
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 300 });
    fireEvent.scroll(log);
    rerender(<MessageList {...base} messages={[msg("m1", 0), msg("m2", 1)]} />);
    metrics(log, { scrollHeight: 2000, clientHeight: 500, scrollTop: 1500 });
    fireEvent.scroll(log);
    expect(screen.queryByRole("button", { name: "Novas mensagens" })).not.toBeInTheDocument();
  });
});
