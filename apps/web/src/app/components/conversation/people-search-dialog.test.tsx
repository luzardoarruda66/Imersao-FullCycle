import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { openDirectAction } from "@/app/actions/conversations";
import { PeopleSearchDialog } from "./people-search-dialog";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/app/actions/conversations", () => ({ openDirectAction: vi.fn() }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const action = vi.mocked(openDirectAction);
const fetchMock = vi.fn();

const ALFREDO = { id: "0192f4a0-0000-7000-8000-000000000001", nome: "Alfredo Luiz", usuario: "alfredo.luiz" };
const LEONAN = { id: "0192f4a0-0000-7000-8000-000000000002", nome: "Leonan Luppi", usuario: "leonan.luppi" };
const LUIZ = { id: "0192f4a0-0000-7000-8000-000000000003", nome: "Luiz Carlos", usuario: "luiz.carlos" };

const reply = (pessoas: object[]) => ({ ok: true, status: 200, json: async () => ({ pessoas }) });
const urlOf = (call: unknown[]) => String(call[0]);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function open() {
  return render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <PeopleSearchDialog open onOpenChange={() => {}} />
    </SWRConfig>,
  );
}
const field = () => screen.getByRole("searchbox", { name: "Buscar por nome ou @usuário" });
const list = () => screen.getByRole("list", { name: "Pessoas" });
const row = (name: RegExp) => within(list()).getByRole("button", { name });

/** O texto que um leitor de tela lê: sem o que é `aria-hidden` (as iniciais do avatar). */
const readable = (el: Element) => {
  const copy = el.cloneNode(true) as Element;
  copy.querySelectorAll("[aria-hidden]").forEach((node) => node.remove());
  return copy.textContent;
};
const rows = () => within(list()).getAllByRole("button").map(readable);

describe("PeopleSearchDialog", () => {
  beforeEach(() => {
    action.mockReset();
    refresh.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("abre com o campo de busca em foco e os primeiros membros, com nome e @usuário", async () => {
    fetchMock.mockResolvedValue(reply([ALFREDO, LEONAN]));
    open();
    expect(screen.getByRole("dialog", { name: "Nova conversa" })).toBeInTheDocument();
    expect(field()).toHaveFocus();
    expect(await screen.findByRole("list", { name: "Pessoas" })).toBeInTheDocument();
    expect(rows()).toEqual(["Alfredo Luiz@alfredo.luiz", "Leonan Luppi@leonan.luppi"]);
    expect(urlOf(fetchMock.mock.calls[0]!)).toBe("/api/pessoas?busca=");
  });

  it("busca ao digitar, com o termo na URL", async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith("busca=lu") ? reply([ALFREDO, LUIZ]) : reply([ALFREDO, LEONAN, LUIZ])));
    const user = userEvent.setup();
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    await user.type(field(), "lu");
    await waitFor(() => expect(rows()).toEqual(["Alfredo Luiz@alfredo.luiz", "Luiz Carlos@luiz.carlos"]));
    expect(fetchMock.mock.calls.map(urlOf)).toContain("/api/pessoas?busca=lu");
  });

  it("codifica o termo na URL", async () => {
    fetchMock.mockResolvedValue(reply([]));
    const user = userEvent.setup();
    open();
    await user.type(field(), "a&b ç");
    await waitFor(() => expect(fetchMock.mock.calls.map(urlOf)).toContain(`/api/pessoas?busca=${encodeURIComponent("a&b ç")}`));
  });

  it("ignora a resposta atrasada de uma busca anterior", async () => {
    const first = deferred<ReturnType<typeof reply>>();
    const second = deferred<ReturnType<typeof reply>>();
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("busca=")) return Promise.resolve(reply([]));
      return url.endsWith("busca=l") ? first.promise : second.promise;
    });
    const user = userEvent.setup();
    open();
    await user.type(field(), "l");
    await user.type(field(), "u");
    second.resolve(reply([LUIZ]));
    await waitFor(() => expect(rows()).toEqual(["Luiz Carlos@luiz.carlos"]));
    first.resolve(reply([ALFREDO, LEONAN, LUIZ]));
    await new Promise((r) => setTimeout(r, 20));
    expect(rows()).toEqual(["Luiz Carlos@luiz.carlos"]);
  });

  it("mostra o carregando enquanto a busca não responde", async () => {
    fetchMock.mockReturnValue(new Promise(() => {}));
    open();
    expect(await screen.findByRole("status")).toHaveTextContent("Buscando pessoas…");
    expect(screen.queryByRole("list", { name: "Pessoas" })).not.toBeInTheDocument();
  });

  it("diz que ninguém foi encontrado, com o termo digitado", async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith("busca=zzz") ? reply([]) : reply([ALFREDO])));
    const user = userEvent.setup();
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    await user.type(field(), "zzz");
    expect(await screen.findByRole("heading", { name: "Ninguém encontrado" })).toBeInTheDocument();
    expect(screen.getByText("Nenhum membro com “zzz” no nome ou no @usuário.")).toBeInTheDocument();
  });

  it("avisa quando não há outras pessoas no workspace", async () => {
    fetchMock.mockResolvedValue(reply([]));
    open();
    expect(await screen.findByText(/Não há outras pessoas no workspace/)).toBeInTheDocument();
  });

  it("mostra o erro com Tentar de novo, mantém o termo e busca de novo ao clicar", async () => {
    let failing = true;
    fetchMock.mockImplementation(async (url: string) => {
      if (url.endsWith("busca=lu") && failing) return { ok: false, status: 503, json: async () => ({}) };
      return reply(url.endsWith("busca=lu") ? [LUIZ] : []);
    });
    const user = userEvent.setup();
    open();
    await user.type(field(), "lu");
    expect(await screen.findByRole("heading", { name: "Não foi possível buscar" })).toBeInTheDocument();
    expect(field()).toHaveValue("lu");
    failing = false;
    await user.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("button", { name: /Luiz Carlos/ })).toBeInTheDocument();
    expect(field()).toHaveValue("lu");
  });

  it("trata a falha de rede como erro", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    open();
    expect(await screen.findByRole("heading", { name: "Não foi possível buscar" })).toBeInTheDocument();
  });

  it("relê a casca quando a sessão não vale mais (401)", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: { code: "sessao_invalida" } }) });
    open();
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });

  it("oferece Ver perfil em cada resultado, com o endereço do Perfil pelo id", async () => {
    fetchMock.mockResolvedValue(reply([ALFREDO, LEONAN]));
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    expect(screen.getByRole("link", { name: "Ver perfil de Alfredo Luiz" })).toHaveAttribute("href", `/pessoas/${ALFREDO.id}`);
    expect(screen.getByRole("link", { name: "Ver perfil de Leonan Luppi" })).toHaveAttribute("href", `/pessoas/${LEONAN.id}`);
  });

  it("abre a conversa direta com o resultado escolhido por clique", async () => {
    fetchMock.mockResolvedValue(reply([ALFREDO, LEONAN]));
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    await user.click(row(/Leonan Luppi/));
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ membroId: LEONAN.id });
  });

  it("com um termo, o Enter no campo abre o primeiro resultado", async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith("busca=lu") ? reply([LUIZ, ALFREDO]) : reply([])));
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    open();
    await user.type(field(), "lu");
    await screen.findByRole("list", { name: "Pessoas" });
    await user.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ membroId: LUIZ.id });
  });

  it("com a busca vazia, o Enter no campo não abre nada", async () => {
    fetchMock.mockResolvedValue(reply([ALFREDO, LEONAN]));
    const user = userEvent.setup();
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    await user.keyboard("{Enter}");
    expect(action).not.toHaveBeenCalled();
  });

  it("navega pelos resultados com as setas, volta ao campo e escolhe só pelo teclado", async () => {
    fetchMock.mockImplementation(async (url: string) => (url.endsWith("busca=lu") ? reply([ALFREDO, LEONAN, LUIZ]) : reply([])));
    action.mockResolvedValue({ status: "idle" });
    const user = userEvent.setup();
    open();
    await user.type(field(), "lu");
    await screen.findByRole("list", { name: "Pessoas" });

    await user.keyboard("{ArrowDown}");
    expect(row(/Alfredo Luiz/)).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(row(/Luiz Carlos/)).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(row(/Luiz Carlos/)).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(row(/Leonan Luppi/)).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(field()).toHaveFocus();

    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![1])).toEqual({ membroId: LEONAN.id });
  });

  it("alcança o Ver perfil pelo Tab, depois do botão da mesma linha, sem abrir a conversa", async () => {
    fetchMock.mockResolvedValue(reply([ALFREDO, LEONAN]));
    const user = userEvent.setup();
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    await user.tab();
    expect(row(/Alfredo Luiz/)).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Ver perfil de Alfredo Luiz" })).toHaveFocus();
    await user.tab();
    expect(row(/Leonan Luppi/)).toHaveFocus();
    expect(action).not.toHaveBeenCalled();
  });

  it("mostra Abrindo a conversa e desabilita os outros resultados enquanto abre", async () => {
    fetchMock.mockResolvedValue(reply([ALFREDO, LEONAN]));
    const opening = deferred<{ status: "idle" }>();
    action.mockReturnValue(opening.promise);
    const user = userEvent.setup();
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    await user.click(row(/Alfredo Luiz/));
    expect(await screen.findByRole("status")).toHaveTextContent("Abrindo a conversa…");
    expect(row(/Leonan Luppi/)).toBeDisabled();
    expect(action).toHaveBeenCalledTimes(1);
    // Libera a ação: uma transição que nunca termina seguraria as dos testes seguintes.
    opening.resolve({ status: "idle" });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());
  });

  it("mostra o erro e mantém o diálogo aberto quando a conversa não abre", async () => {
    fetchMock.mockResolvedValue(reply([ALFREDO]));
    action.mockResolvedValue({ status: "error", message: "Não foi possível abrir a conversa. Tente de novo." });
    const user = userEvent.setup();
    open();
    await screen.findByRole("list", { name: "Pessoas" });
    await user.click(row(/Alfredo Luiz/));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível abrir a conversa");
    expect(screen.getByRole("dialog", { name: "Nova conversa" })).toBeInTheDocument();
    expect(row(/Alfredo Luiz/)).toBeEnabled();
  });
});
