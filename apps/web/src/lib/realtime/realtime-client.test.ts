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
  emitted: { event: string; payload: unknown }[] = [];
  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
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

  describe("estado da conexão", () => {
    it("começa conectando, sem alarde, e passa a conectado na primeira conexão", () => {
      const { client, sockets } = setup();
      expect(client.getState()).toBe("connecting");
      client.start();
      expect(client.getState()).toBe("connecting");
      sockets[0]!.fire("connect");
      expect(client.getState()).toBe("connected");
    });

    it("a queda depois de conectado vira reconectando e a volta, conectado", () => {
      const { client, sockets } = setup();
      client.start();
      sockets[0]!.fire("connect");
      sockets[0]!.fire("disconnect", "transport close");
      expect(client.getState()).toBe("reconnecting");
      sockets[0]!.fire("connect");
      expect(client.getState()).toBe("connected");
    });

    it("o erro de conexão antes da primeira conexão não vira reconectando", () => {
      const { client, sockets } = setup();
      client.start();
      sockets[0]!.fire("connect_error", new Error("xhr poll error"));
      expect(client.getState()).toBe("connecting");
    });

    it("o erro de conexão depois de ter conectado mantém reconectando", () => {
      const { client, sockets } = setup();
      client.start();
      sockets[0]!.fire("connect");
      sockets[0]!.fire("disconnect", "ping timeout");
      sockets[0]!.fire("connect_error", new Error("xhr poll error"));
      expect(client.getState()).toBe("reconnecting");
    });

    it("avisa quem assinou a cada mudança e para depois de cancelar", () => {
      const { client, sockets } = setup();
      const listener = vi.fn();
      const cancel = client.subscribeState(listener);
      client.start();
      sockets[0]!.fire("connect");
      expect(listener).toHaveBeenCalledTimes(1);
      cancel();
      sockets[0]!.fire("disconnect", "transport close");
      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("o stop volta ao estado inicial", () => {
      const { client, sockets } = setup();
      client.start();
      sockets[0]!.fire("connect");
      client.stop();
      expect(client.getState()).toBe("connecting");
    });
  });

  describe("eventos só ao vivo", () => {
    const typing = (id: string) =>
      ({ id, tipo: "digitando", dados: { conversa_id: "c1", pessoa: { id: "p1", usuario: "ana" } }, momento: "agora" }) as ChatEvent;

    it("entrega o digitando sem mexer no último evento confirmado", () => {
      const { client, sockets } = setup();
      const listener = vi.fn();
      client.subscribe("digitando", listener);
      client.start();
      sockets[0]!.fire("evento", diag("e-10-0"));
      sockets[0]!.fire("evento", typing("ao_vivo-99-0"));
      expect(listener).toHaveBeenCalledTimes(1);
      expect(sockets[0]!.handshake()).toEqual({ ultimo_evento: "e-10-0" });
    });

    it("não descarta um digitando repetido como evento antigo", () => {
      const { client, sockets } = setup();
      const listener = vi.fn();
      client.subscribe("digitando", listener);
      client.start();
      sockets[0]!.fire("evento", diag("e-10-0"));
      sockets[0]!.fire("evento", typing("ao_vivo-1-0"));
      sockets[0]!.fire("evento", typing("ao_vivo-1-0"));
      expect(listener).toHaveBeenCalledTimes(2);
    });
  });

  describe("mensagens do cliente", () => {
    it("manda o digitando pelo socket aberto", () => {
      const { client, sockets } = setup();
      client.start();
      client.sendTyping("c1");
      expect(sockets[0]!.emitted).toEqual([{ event: "digitando", payload: { conversa_id: "c1" } }]);
    });

    it("não manda nada sem conexão aberta", () => {
      const { client } = setup();
      expect(() => client.sendTyping("c1")).not.toThrow();
    });
  });
});
