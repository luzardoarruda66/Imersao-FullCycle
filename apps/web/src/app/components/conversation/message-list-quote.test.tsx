import type { ChatMessage } from "chat-events";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageList } from "./message-list";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const base = (over: Partial<ChatMessage>): ChatMessage => ({
  id: "m2",
  conversa_id: "c1",
  autor: { id: "p1", nome: "Admin", usuario: "admin" },
  texto: "Vi sim, já abri uma correção.",
  criada_em: new Date(2026, 10, 24, 9, 12).toISOString(),
  mencoes: [],
  citacao: null,
  editada_em: null,
  apagada: false,
  ...over,
});
const quote = { id: "m1", autor: { id: "p2", nome: "Regina Fonseca", usuario: "regina" }, trecho: "Alguém viu o aviso?", apagada: false };

describe("MessageList: citação", () => {
  it("mostra o autor e o trecho da mensagem citada acima do texto", () => {
    render(<MessageList messages={[base({ citacao: quote })]} intro={null} />);
    const link = screen.getByRole("button", { name: /Ir para a mensagem de Regina Fonseca/ });
    expect(link).toHaveTextContent("Regina Fonseca");
    expect(link).toHaveTextContent("Alguém viu o aviso?");
    expect(screen.getByText("Vi sim, já abri uma correção.")).toBeInTheDocument();
  });

  it("clicar ou acionar pelo teclado leva até a original", async () => {
    const onGoToMessage = vi.fn();
    render(<MessageList messages={[base({ citacao: quote })]} intro={null} onGoToMessage={onGoToMessage} />);
    await userEvent.click(screen.getByRole("button", { name: /Ir para a mensagem/ }));
    screen.getByRole("button", { name: /Ir para a mensagem/ }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onGoToMessage).toHaveBeenNthCalledWith(1, "m1");
    expect(onGoToMessage).toHaveBeenNthCalledWith(2, "m1");
  });

  it("a citação de uma mensagem apagada mostra \"Mensagem apagada\" e não leva a lugar nenhum", () => {
    render(<MessageList messages={[base({ citacao: { ...quote, trecho: "", apagada: true } })]} intro={null} />);
    expect(screen.queryByRole("button", { name: /Ir para a mensagem/ })).not.toBeInTheDocument();
    expect(screen.getByText("Mensagem apagada")).toBeInTheDocument();
    expect(screen.getByText("Regina Fonseca")).toBeInTheDocument();
  });

  it("cada mensagem pode ser achada pelo id, para a citação rolar até ela", () => {
    render(<MessageList messages={[base({})]} intro={null} />);
    expect(document.getElementById("mensagem-m2")).toBeInTheDocument();
  });

  it("Citar entra no menu e na barra, antes de Copiar texto, e entrega a mensagem", async () => {
    const onQuote = vi.fn();
    const message = base({});
    render(<MessageList messages={[message]} intro={null} onQuote={onQuote} />);
    const buttons = screen.getByRole("group", { name: "Ações da mensagem" }).querySelectorAll("button");
    expect([...buttons].map((b) => b.getAttribute("aria-label"))).toEqual(["Citar", "Copiar texto", "Mais ações"]);
    screen.getByRole("button", { name: "Citar" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(onQuote).toHaveBeenCalledWith(message);
  });

  it("sem quem trate a citação, a ação Citar não aparece; e na mensagem apagada nunca aparece", () => {
    const { rerender } = render(<MessageList messages={[base({})]} intro={null} />);
    expect(screen.queryByRole("button", { name: "Citar" })).not.toBeInTheDocument();
    rerender(<MessageList messages={[base({ apagada: true, texto: "" })]} intro={null} onQuote={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Citar" })).not.toBeInTheDocument();
  });
});
