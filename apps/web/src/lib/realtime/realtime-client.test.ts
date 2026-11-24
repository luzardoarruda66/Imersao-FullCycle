import type { ChatEvent } from "chat-events";
import { describe, expect, it, vi } from "vitest";
import { RealtimeClient, type SocketOptions } from "./realtime-client";

class FakeSocket {
  private handlers = new Map<string, (arg: never) => void>();
  disconnected = false;
  constructor(readonly options: SocketOptions) {}
  on(event: string, listener: (arg: never) => void) {
    this.handlers.set(event, listener);
  }
  disconnect() {
    this.disconnected = true;
  }
  /** O servidor ou a rede disparam o evento no cliente. */
  fire(event: string, ...args: unknown[]) {
    (this.handlers.get(event) as ((...args: unknown[]) => void) | undefined)?.(...args);
  }
  /** O que o handshake leva agora, como o Socket.IO o pede a cada (re)conexão. */
  handshake() {
    let sent: unknown;
    this.options.auth((data) => (sent = data));
    return sent;
  }
}

const diag = (id: string, mensagem = id): ChatEvent => ({ id, tipo: "diagnostico", dados: { mensagem }, momento: "agora" });

function setup() {
  const sockets: FakeSocket[] = [];
  const reload = vi.fn();
  const createSocket = vi.fn((_url: string, options: SocketOptions) => {
    const socket = new FakeSocket(options);
    sockets.push(socket);
    return socket;
  });
  const client = new RealtimeClient({ url: "http://api", createSocket, reload });
  return { client, sockets, reload, createSocket };
}

describe("RealtimeClient", () => {
  it("abre uma conexão só, mesmo chamado duas vezes", () => {
    const { client, createSocket } = setup();
    client.start();
    client.start();
    expect(createSocket).toHaveBeenCalledTimes(1);
    expect(createSocket).toHaveBeenCalledWith("http://api", expect.any(Object));
  });

  it("não manda último evento na primeira conexão e o manda depois de confirmar um", () => {
    const { client, sockets } = setup();
    client.start();
    expect(sockets[0]!.handshake()).toEqual({});
    sockets[0]!.fire("evento", diag("e-10-0"));
    expect(sockets[0]!.handshake()).toEqual({ ultimo_evento: "e-10-0" });
  });

  it("guarda o ponto de partida do `pronto` para a reconexão", () => {
    const { client, sockets } = setup();
    client.start();
    sockets[0]!.fire("pronto", { ultimo_evento: "e-5-1" });
    expect(sockets[0]!.handshake()).toEqual({ ultimo_evento: "e-5-1" });
  });

  it("sem ponto de partida do servidor, manda a marca que provoca o `perdido`", () => {
    const { client, sockets } = setup();
    client.start();
    sockets[0]!.fire("pronto", { ultimo_evento: null });
    expect(sockets[0]!.handshake()).toEqual({ ultimo_evento: "indisponivel" });
  });

  it("entrega os eventos só a quem se inscreveu no tipo, até cancelar", () => {
    const { client, sockets } = setup();
    const listener = vi.fn();
    client.start();
    const unsubscribe = client.subscribe("diagnostico", listener);
    sockets[0]!.fire("evento", diag("e-1-0", "a"));
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ dados: { mensagem: "a" } }));
    unsubscribe();
    sockets[0]!.fire("evento", diag("e-2-0", "b"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("ignora o evento repetido ou anterior ao último, mas aceita o de outra época", () => {
    const { client, sockets } = setup();
    const listener = vi.fn();
    client.start();
    client.subscribe("diagnostico", listener);
    sockets[0]!.fire("evento", diag("e-10-1"));
    sockets[0]!.fire("evento", diag("e-10-1"));
    sockets[0]!.fire("evento", diag("e-10-0"));
    expect(listener).toHaveBeenCalledTimes(1);
    sockets[0]!.fire("evento", diag("outra-1-0"));
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("recarrega a página no `perdido` e deixa de reconectar", () => {
    const { client, sockets, reload } = setup();
    client.start();
    sockets[0]!.fire("perdido", {});
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sockets[0]!.disconnected).toBe(true);
  });

  it("recarrega e para quando a recusa é sessao_invalida", () => {
    const { client, sockets, reload } = setup();
    client.start();
    sockets[0]!.fire("connect_error", { data: { code: "sessao_invalida" } });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sockets[0]!.disconnected).toBe(true);
  });

  it("recarrega quando o servidor fecha a conexão, mas não na queda de rede", () => {
    const { client, sockets, reload } = setup();
    client.start();
    sockets[0]!.fire("disconnect", "transport close");
    expect(reload).not.toHaveBeenCalled();
    expect(sockets[0]!.disconnected).toBe(false);
    sockets[0]!.fire("disconnect", "io server disconnect");
    expect(reload).toHaveBeenCalledTimes(1);
    expect(sockets[0]!.disconnected).toBe(true);
  });

  it("deixa o Socket.IO reconectar no erro de rede e para, sem recarregar, na origem recusada", () => {
    const { client, sockets, reload } = setup();
    client.start();
    sockets[0]!.fire("connect_error", new Error("xhr poll error"));
    expect(sockets[0]!.disconnected).toBe(false);
    sockets[0]!.fire("connect_error", { data: { code: "origem_invalida" } });
    expect(sockets[0]!.disconnected).toBe(true);
    expect(reload).not.toHaveBeenCalled();
  });

  it("abre outra conexão ao recomeçar depois de parar", () => {
    const { client, createSocket } = setup();
    client.start();
    client.stop();
    client.start();
    expect(createSocket).toHaveBeenCalledTimes(2);
  });

  it("cada aba lembra do próprio último evento, sem afetar a outra", () => {
    const tabA = setup();
    const tabB = setup();
    tabA.client.start();
    tabB.client.start();
    tabA.sockets[0]!.fire("evento", diag("e-20-0"));
    tabB.sockets[0]!.fire("evento", diag("e-5-0"));
    expect(tabA.sockets[0]!.handshake()).toEqual({ ultimo_evento: "e-20-0" });
    expect(tabB.sockets[0]!.handshake()).toEqual({ ultimo_evento: "e-5-0" });
  });
});
