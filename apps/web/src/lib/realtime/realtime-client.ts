import { CLIENT_MESSAGES, type ChatEvent, SERVER_MESSAGES, isLiveOnly, isNewerEventId } from "chat-events";

/** Marca de "sem ponto de partida": o servidor responde `perdido` a ela, e a aba recarrega. */
const NO_STARTING_POINT = "indisponivel";

/** O pedaço do socket do Socket.IO que o cliente usa; os testes o trocam por um socket falso. */
export interface SocketLike {
  on(event: string, listener: (arg: never) => void): unknown;
  disconnect(): unknown;
  emit?(event: string, payload: unknown): unknown;
}

/** `connecting`: ainda não conectou (sem alarde na tela); `reconnecting`: caiu depois de conectar. */
export type ConnectionState = "connecting" | "connected" | "reconnecting";

export interface SocketOptions {
  /** Chamado a cada conexão e reconexão: entrega o último evento confirmado no handshake. */
  auth: (callback: (data: { ultimo_evento?: string }) => void) => void;
}

export type SocketFactory = (url: string, options: SocketOptions) => SocketLike;

export type EventListener<T extends ChatEvent["tipo"]> = (event: Extract<ChatEvent, { tipo: T }>) => void;

interface Options {
  url: string;
  createSocket: SocketFactory;
  /** Recarrega a página atual: o servidor do `web` revalida a sessão e o proxy leva a "Entrar" (LLD, seção 8). */
  reload: () => void;
}

/**
 * Conexão em tempo real de uma aba, sem tela (LLD, seção 8, "Conexão em tempo real"): guarda o último evento
 * confirmado, o manda a cada reconexão e entrega os eventos por tipo a quem se inscreveu.
 */
export class RealtimeClient {
  private socket: SocketLike | null = null;
  private lastEventId: string | undefined;
  private readonly listeners = new Map<string, Set<(event: ChatEvent) => void>>();
  private state: ConnectionState = "connecting";
  private readonly stateListeners = new Set<() => void>();

  constructor(private readonly options: Options) {}

  /** Abre a conexão; chamar de novo com ela aberta não abre outra (uma por aba). */
  start() {
    if (this.socket) return;
    const socket = this.options.createSocket(this.options.url, {
      auth: (callback) => callback(this.lastEventId === undefined ? {} : { ultimo_evento: this.lastEventId }),
    });
    this.socket = socket;

    socket.on(SERVER_MESSAGES.event, (event: ChatEvent) => this.receive(event));
    socket.on(SERVER_MESSAGES.ready, (message: { ultimo_evento: string | null }) => {
      if (message.ultimo_evento) this.lastEventId = message.ultimo_evento;
      else this.lastEventId ??= NO_STARTING_POINT;
    });
    socket.on(SERVER_MESSAGES.lost, () => this.giveUp(true));
    // A recusa traz o código do catálogo; erro de rede não traz, e o Socket.IO tenta de novo sozinho.
    socket.on("connect_error", (error: { data?: { code?: string } }) => {
      if (error.data?.code === "sessao_invalida") this.giveUp(true);
      else if (error.data?.code === "origem_invalida") this.giveUp(false);
    });
    // O fechamento pelo servidor (sessão encerrada) não reconecta; a queda de rede, sim.
    socket.on("disconnect", (reason: string) => {
      if (reason === "io server disconnect") this.giveUp(true);
      else this.setState("reconnecting");
    });
    // A primeira conexão da página não passa por "reconectando": o estado só cai depois de ter conectado.
    socket.on("connect", () => this.setState("connected"));
  }

  /** Fecha a conexão e deixa de reconectar. */
  stop() {
    this.socket?.disconnect();
    this.socket = null;
    this.setState("connecting");
  }

  /** Recebe os eventos de um tipo; devolve quem cancela a inscrição. */
  subscribe<T extends ChatEvent["tipo"]>(type: T, listener: EventListener<T>) {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as (event: ChatEvent) => void);
    this.listeners.set(type, set);
    return () => {
      set.delete(listener as (event: ChatEvent) => void);
    };
  }

  /** O estado atual da conexão (para `useSyncExternalStore`). */
  getState(): ConnectionState {
    return this.state;
  }

  /** Avisa a cada mudança do estado da conexão; devolve quem cancela. */
  subscribeState(listener: () => void) {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /** Avisa o servidor de que a pessoa digita na conversa. Sem conexão aberta, não faz nada. */
  sendTyping(conversationId: string) {
    this.socket?.emit?.(CLIENT_MESSAGES.typing, { conversa_id: conversationId });
  }

  private setState(next: ConnectionState) {
    if (next === this.state) return;
    this.state = next;
    for (const listener of this.stateListeners) listener();
  }

  private receive(event: ChatEvent) {
    // O evento só ao vivo não tem ponto de reposição: não mexe no último confirmado nem é descartado por ele.
    if (isLiveOnly(event.tipo)) {
      for (const listener of this.listeners.get(event.tipo) ?? []) listener(event);
      return;
    }
    // Repetido: da mesma época e não posterior ao último confirmado.
    if (this.lastEventId && !isNewerEventId(event.id, this.lastEventId)) return;
    this.lastEventId = event.id;
    for (const listener of this.listeners.get(event.tipo) ?? []) listener(event);
  }

  private giveUp(reload: boolean) {
    this.stop();
    if (reload) this.options.reload();
  }
}
