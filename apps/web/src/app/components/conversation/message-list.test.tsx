import type { ChatMessage } from "chat-events";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { MessageList } from "./message-list";

const at = (id: string, date: Date, autor = "Ana", texto = id): ChatMessage => ({
  id,
  conversa_id: "c1",
  autor: { id: "p1", nome: autor, usuario: "ana" },
  texto,
  criada_em: date.toISOString(),
  mencoes: [], citacao: null, editada_em: null, apagada: false,
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const toastSuccess = vi.mocked(toast.success);
const toastError = vi.mocked(toast.error);

describe("MessageList", () => {
  describe("ações da mensagem", () => {
    afterEach(() => vi.unstubAllGlobals());
    const one = (over: Partial<ChatMessage> = {}) => [{ ...at("m1", new Date(2026, 10, 24, 14, 10), "Ana", "Oi @bia, tudo bem?"), ...over }];

    it("cada mensagem tem a barra de ações com Copiar texto", () => {
      render(<MessageList messages={one()} intro={null} />);
      expect(screen.getByRole("group", { name: "Ações da mensagem" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Copiar texto" })).toBeInTheDocument();
    });

    it("Copiar texto copia o texto puro, com o @usuário, e avisa o sucesso", async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });
      toastSuccess.mockClear();
      render(<MessageList messages={one({ mencoes: [{ id: "p2", usuario: "bia" }] })} intro={null} />);
      await userEvent.click(screen.getByRole("button", { name: "Copiar texto" }));
      expect(writeText).toHaveBeenCalledWith("Oi @bia, tudo bem?");
      expect(toastSuccess).toHaveBeenCalledWith("Texto copiado");
    });

    it("com o navegador recusando, avisa a falha", async () => {
      vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("negado")) } });
      toastError.mockClear();
      render(<MessageList messages={one()} intro={null} />);
      await userEvent.click(screen.getByRole("button", { name: "Copiar texto" }));
      expect(toastError).toHaveBeenCalledWith("Não foi possível copiar o texto");
    });

    it("mensagem apagada mostra o aviso no lugar do texto e não tem menu", () => {
      render(<MessageList messages={one({ apagada: true, texto: "" })} intro={null} />);
      expect(screen.getByText("Mensagem apagada")).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "Ações da mensagem" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Copiar texto" })).not.toBeInTheDocument();
    });
  });

  it("destaca só as menções que a API reconheceu, como texto da mensagem", () => {
    const message = { ...at("m1", new Date(2026, 10, 24, 14, 10), "Ana", "Oi @bia, escreva para caio@empresa.com ou @ninguem"), mencoes: [{ id: "p2", usuario: "bia" }] };
    render(<MessageList messages={[message]} intro={null} />);
    const chip = screen.getByText("@bia");
    expect(chip).toHaveClass("bg-mention-bg", "text-mention-fg");
    expect(screen.getByText(/escreva para caio@empresa.com ou @ninguem/)).not.toHaveClass("bg-mention-bg");
    expect(screen.getByRole("log").textContent).toContain("Oi @bia, escreva para caio@empresa.com ou @ninguem");
  });

  it("destaca em amarelo a menção ao próprio membro, e em azul a das outras pessoas", () => {
    const message = {
      ...at("m1", new Date(2026, 10, 24, 14, 10), "Ana", "@bia e @caio"),
      mencoes: [{ id: "p2", usuario: "bia" }, { id: "p3", usuario: "caio" }],
    };
    render(<MessageList messages={[message]} intro={null} currentMemberId="p2" />);
    expect(screen.getByText("@bia")).toHaveClass("bg-mention-self-bg", "text-mention-self-fg");
    expect(screen.getByText("@caio")).toHaveClass("bg-mention-bg", "text-mention-fg");
  });

  it("mostra autor, horário e texto de cada mensagem", () => {
    render(<MessageList messages={[at("m1", new Date(2026, 10, 24, 14, 10), "Ana", "Bom dia")]} intro={null} />);
    expect(screen.getByText("Ana")).toBeInTheDocument();
    expect(screen.getByText("Bom dia")).toBeInTheDocument();
    expect(screen.getByText("14:10")).toHaveAttribute("datetime", new Date(2026, 10, 24, 14, 10).toISOString());
  });

  it("separa os dias, com Hoje e Ontem", () => {
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12, 0);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0);
    render(<MessageList messages={[at("m1", yesterday), at("m2", today)]} intro={null} />);
    expect(screen.getByText("Ontem")).toBeInTheDocument();
    expect(screen.getByText("Hoje")).toBeInTheDocument();
  });

  it("anuncia as mensagens novas como um registro", () => {
    render(<MessageList messages={[]} intro={<p>começo</p>} />);
    expect(screen.getByRole("log", { name: "Mensagens" })).toHaveAttribute("aria-live", "polite");
    expect(screen.getByText("começo")).toBeInTheDocument();
  });

  it("quebra linhas e preserva o texto sem interpretá-lo como HTML", () => {
    render(<MessageList messages={[at("m1", new Date(), "Ana", "<b>negrito</b>\nsegunda linha")]} intro={null} />);
    expect(screen.getByText(/<b>negrito<\/b>/)).toBeInTheDocument();
    expect(document.querySelector("b")).toBeNull();
  });
});
