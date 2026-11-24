import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ConversationList } from "@/lib/conversations";
import { Sidebar } from "./sidebar";

let pathname = "/";
const refresh = vi.fn();
let conversaVisivel: (() => void) | undefined;

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
    subscribe: (_type: string, callback: () => void) => {
      conversaVisivel = callback;
      return () => {};
    },
  }),
}));
vi.mock("@/app/actions/conversations", () => ({ createChannelAction: vi.fn(), openDirectAction: vi.fn() }));

const LIST: ConversationList = {
  canais_publicos: [
    { id: "c-geral", tipo: "canal_publico", nome: "geral" },
    { id: "c-anuncios", tipo: "canal_publico", nome: "anúncios" },
  ],
  canais_privados: [{ id: "c-diretoria", tipo: "canal_privado", nome: "diretoria" }],
  diretas: [{ id: "d-bia", tipo: "direta", nome: "Bia" }],
};

describe("Sidebar", () => {
  beforeEach(() => {
    pathname = "/";
    refresh.mockReset();
    conversaVisivel = undefined;
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
    expect(screen.getByRole("combobox", { name: "Buscar por nome ou @usuário" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(header!);
    expect(screen.getByRole("dialog", { name: "Nova conversa" })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("relê a lista quando o tempo real avisa de uma conversa nova", () => {
    render(<Sidebar list={LIST} />);
    act(() => conversaVisivel!());
    expect(refresh).toHaveBeenCalled();
  });

  it("mostra o erro da lista com 'Tentar de novo', sem tirar a pessoa da sessão", async () => {
    const user = userEvent.setup();
    render(<Sidebar list={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar suas conversas.");
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(refresh).toHaveBeenCalled();
  });
});
