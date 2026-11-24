import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConversationList } from "@/lib/conversations";
import { setReadingConversation } from "@/lib/open-conversation";
import { Sidebar } from "./sidebar";

let pathname = "/";
const refresh = vi.fn();
const handlers: Record<string, (event: unknown) => void> = {};

vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useRouter: () => ({ refresh }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("@/lib/realtime/realtime", () => ({
  getRealtimeClient: () => ({
    getState: () => "connecting",
    subscribeState: () => () => {},
    subscribe: (type: string, callback: (event: unknown) => void) => {
      handlers[type] = callback;
      return () => {};
    },
  }),
}));
vi.mock("@/app/actions/conversations", () => ({ createChannelAction: vi.fn(), openDirectAction: vi.fn() }));

const LIST: ConversationList = {
  canais_publicos: [
    { id: "c-geral", tipo: "canal_publico", nome: "geral", nao_lidas: 0, mencoes: 0 },
    { id: "c-anuncios", tipo: "canal_publico", nome: "anúncios", nao_lidas: 0, mencoes: 0 },
  ],
  canais_privados: [{ id: "c-diretoria", tipo: "canal_privado", nome: "diretoria", nao_lidas: 0, mencoes: 0 }],
  diretas: [{ id: "d-bia", tipo: "direta", nome: "Bia", nao_lidas: 0, mencoes: 0 }],
};

describe("Sidebar", () => {
  beforeEach(() => {
    pathname = "/";
    refresh.mockReset();
    for (const key of Object.keys(handlers)) delete handlers[key];
  });

  it("lista os canais em ordem alfabética, públicos e privados, e as conversas diretas pelo nome da outra pessoa", () => {
    render(<Sidebar list={LIST} />);
    const channels = screen.getByRole("region", { name: "Canais" });
    expect(channels.querySelectorAll("a")).toHaveLength(3);
    expect([...channels.querySelectorAll("a")].map((a) => a.textContent)).toEqual(["anúncios", "diretoria", "geral"]);
    const directs = screen.getByRole("region", { name: "Conversas diretas" });
    expect(directs).toHaveTextContent("Bia");
  });

  it("cada conversa leva ao seu endereço e a aberta fica marcada", () => {
    pathname = "/conversas/c-geral";
    render(<Sidebar list={LIST} />);
    expect(screen.getByRole("link", { name: "geral" })).toHaveAttribute("href", "/conversas/c-geral");
    expect(screen.getByRole("link", { name: "geral" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "diretoria" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Bia" })).toHaveAttribute("href", "/conversas/d-bia");
  });

  it("abre o diálogo de criar canal", async () => {
    const user = userEvent.setup();
    render(<Sidebar list={LIST} />);
    await user.click(screen.getByRole("button", { name: "Adicionar canal" }));
    expect(screen.getByRole("dialog", { name: "Criar canal" })).toBeInTheDocument();
  });

  it("abre a busca de pessoas pela ação da seção e pelo botão do cabeçalho", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ pessoas: [] }) }));
    const user = userEvent.setup();
    render(<Sidebar list={LIST} />);
    const [header, row] = screen.getAllByRole("button", { name: "Nova conversa" });
    await user.click(row!);
    expect(screen.getByRole("dialog", { name: "Nova conversa" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Buscar por nome ou @usuário" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(header!);
    expect(screen.getByRole("dialog", { name: "Nova conversa" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("relê a lista quando o tempo real avisa de uma conversa nova", () => {
    render(<Sidebar list={LIST} />);
    act(() => handlers.conversa_visivel!({}));
    expect(refresh).toHaveBeenCalled();
  });

  describe("não lidas e menções", () => {
    const withCounts = (nao_lidas: number, mencoes = 0): ConversationList => ({
      ...LIST,
      canais_publicos: [{ ...LIST.canais_publicos[0]!, nao_lidas, mencoes }, LIST.canais_publicos[1]!],
    });
    const created = (conversa: string, nao_lidas: number, mencoes = 0) => ({
      tipo: "mensagem_criada",
      dados: { conversa_id: conversa, contagens: { nao_lidas, mencoes } },
    });

    it("mostra o selo com a contagem e o nome acessível com ela por extenso", () => {
      render(<Sidebar list={withCounts(3)} />);
      const link = screen.getByRole("link", { name: "geral, 3 não lidas" });
      expect(link).toHaveTextContent("3");
    });

    it("mostra 99+ acima de 99 e nenhum selo em zero", () => {
      render(<Sidebar list={withCounts(120)} />);
      expect(screen.getByRole("link", { name: "geral, 99+ não lidas" })).toHaveTextContent("99+");
      expect(screen.getByRole("link", { name: "anúncios" })).toHaveTextContent(/^anúncios$/);
    });

    it("mostra a contagem de menções ao lado, e só quando não é zero", () => {
      render(<Sidebar list={withCounts(3, 2)} />);
      expect(screen.getByRole("link", { name: "geral, 3 não lidas, 2 menções" })).toHaveTextContent("@2");
    });

    it("sobe na hora com o evento de mensagem criada", () => {
      render(<Sidebar list={LIST} />);
      act(() => handlers.mensagem_criada!(created("c-anuncios", 1)));
      expect(screen.getByRole("link", { name: "anúncios, 1 não lida" })).toBeInTheDocument();
      act(() => handlers.mensagem_criada!(created("c-anuncios", 2)));
      expect(screen.getByRole("link", { name: "anúncios, 2 não lidas" })).toBeInTheDocument();
    });

    it("zera com o evento de contagem atualizada, vindo de outra aba", () => {
      render(<Sidebar list={withCounts(5)} />);
      act(() => handlers.contagem_atualizada!({ tipo: "contagem_atualizada", dados: { conversa_id: "c-geral", nao_lidas: 0, mencoes: 0 } }));
      expect(screen.getByRole("link", { name: "geral" })).toBeInTheDocument();
    });

    it("não mostra selo novo na conversa que a aba está lendo agora", () => {
      setReadingConversation("c-geral");
      render(<Sidebar list={LIST} />);
      act(() => handlers.mensagem_criada!(created("c-geral", 1)));
      expect(screen.getByRole("link", { name: "geral" })).toBeInTheDocument();
      setReadingConversation(null);
    });

    it("a lista relida pelo servidor substitui as contagens da tela", () => {
      const { rerender } = render(<Sidebar list={LIST} />);
      act(() => handlers.mensagem_criada!(created("c-anuncios", 4)));
      rerender(<Sidebar list={withCounts(2)} />);
      expect(screen.getByRole("link", { name: "geral, 2 não lidas" })).toBeInTheDocument();
    });
  });

  it("mostra o erro da lista com 'Tentar de novo', sem tirar a pessoa da sessão", async () => {
    const user = userEvent.setup();
    render(<Sidebar list={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar suas conversas.");
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(refresh).toHaveBeenCalled();
  });
});
