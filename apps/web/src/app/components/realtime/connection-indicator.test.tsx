import { act, render, screen } from "@testing-library/react";
import { RealtimeClient, type SocketLike } from "@/lib/realtime/realtime-client";
import { ConnectionIndicator } from "./connection-indicator";

class FakeSocket implements SocketLike {
  handlers = new Map<string, (arg: never) => void>();
  on(event: string, listener: (arg: never) => void) {
    this.handlers.set(event, listener);
  }
  disconnect() {}
  fire(event: string, ...args: unknown[]) {
    (this.handlers.get(event) as ((...args: unknown[]) => void) | undefined)?.(...args);
  }
}

const socket = new FakeSocket();
let client: RealtimeClient;

vi.mock("@/lib/realtime/realtime", () => ({ getRealtimeClient: () => client }));

describe("ConnectionIndicator", () => {
  beforeEach(() => {
    socket.handlers.clear();
    client = new RealtimeClient({ url: "http://api", createSocket: () => socket, reload: () => {} });
    client.start();
  });

  it("não mostra nada na primeira conexão da página, só a região educada vazia", () => {
    render(<ConnectionIndicator />);
    const region = screen.getByRole("status");
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toBeEmptyDOMElement();
    expect(screen.queryByText("Reconectando")).not.toBeInTheDocument();
  });

  it("mostra Conectado quando conecta, em texto e não só em cor", () => {
    render(<ConnectionIndicator />);
    act(() => socket.fire("connect"));
    expect(screen.getByRole("status")).toHaveTextContent("Conectado");
  });

  it("mostra Reconectando na queda e volta a Conectado quando a conexão volta", () => {
    render(<ConnectionIndicator />);
    act(() => socket.fire("connect"));
    act(() => socket.fire("disconnect", "transport close"));
    expect(screen.getByRole("status")).toHaveTextContent("Reconectando");
    act(() => socket.fire("connect"));
    expect(screen.getByRole("status")).toHaveTextContent("Conectado");
  });
});
