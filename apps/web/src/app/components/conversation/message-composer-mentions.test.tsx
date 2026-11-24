import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SWRConfig } from "swr";
import { sendMessageAction } from "@/app/actions/conversations";
import { MessageComposer } from "./message-composer";

vi.mock("@/app/actions/conversations", () => ({ sendMessageAction: vi.fn() }));
const action = vi.mocked(sendMessageAction);
const fetchMock = vi.fn();

const BIA = { id: "p2", nome: "Bia Souza", usuario: "bia" };
const CAIO = { id: "p3", nome: "Caio Lima", usuario: "caio" };
const PLACEHOLDER = "Mensagem para #geral";

const reply = (pessoas: object[]) => ({ ok: true, status: 200, json: async () => ({ pessoas }) });
const urlOf = (call: unknown[]) => String(call[0]);

function setup() {
  const user = userEvent.setup();
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <MessageComposer conversationId="c 1" placeholder={PLACEHOLDER} onSent={() => {}} />
    </SWRConfig>,
  );
  return { user, field: screen.getByRole("textbox", { name: PLACEHOLDER }) };
}
const options = () => screen.queryAllByRole("option").map((option) => option.textContent);

describe("MessageComposer: lista de @", () => {
  beforeEach(() => {
    action.mockReset();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(reply([BIA, CAIO]));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("abre a lista dos participantes ao digitar @, pela rota do BFF da conversa", async () => {
    const { user, field } = setup();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(field, "Bom dia, @");
    const listbox = await screen.findByRole("listbox", { name: "Pessoas para mencionar" });
    await waitFor(() => expect(within(listbox).getAllByRole("option")).toHaveLength(2));
    expect(urlOf(fetchMock.mock.calls.at(-1)!)).toBe("/api/conversas/c%201/mencionaveis?busca=");
    expect(options()[0]).toContain("Bia Souza");
    expect(options()[0]).toContain("@bia");
  });

  it("filtra pelo que vem depois do @", async () => {
    const { user, field } = setup();
    await user.type(field, "@Bi");
    await waitFor(() => expect(fetchMock.mock.calls.map(urlOf)).toContain("/api/conversas/c%201/mencionaveis?busca=bi"));
  });

  it("escolhe com as setas e Enter: insere o @usuário, fecha a lista e não envia a mensagem", async () => {
    const { user, field } = setup();
    await user.type(field, "oi @");
    await screen.findByRole("option", { name: /Bia Souza/ });
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /Caio Lima/ })).toHaveAttribute("aria-selected", "true");
    expect(field).toHaveAttribute("aria-activedescendant", screen.getByRole("option", { name: /Caio Lima/ }).id);
    await user.keyboard("{Enter}");
    expect(field).toHaveValue("oi @caio ");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("a seta para cima volta e dá a volta pela lista", async () => {
    const { user, field } = setup();
    await user.type(field, "@");
    await screen.findByRole("option", { name: /Bia Souza/ });
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: /Caio Lima/ })).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: /Bia Souza/ })).toHaveAttribute("aria-selected", "true");
  });

  it("Tab também escolhe, e o clique escolhe a pessoa clicada", async () => {
    const { user, field } = setup();
    await user.type(field, "@");
    await screen.findByRole("option", { name: /Bia Souza/ });
    await user.keyboard("{Tab}");
    expect(field).toHaveValue("@bia ");

    await user.type(field, "e @");
    await user.click(await screen.findByRole("option", { name: /Caio Lima/ }));
    expect(field).toHaveValue("@bia e @caio ");
  });

  it("Esc fecha a lista sem mexer no texto, e ela volta ao digitar de novo", async () => {
    const { user, field } = setup();
    await user.type(field, "@b");
    await screen.findByRole("listbox");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(field).toHaveValue("@b");
    await user.type(field, "i");
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
  });

  it("fecha ao apagar o @ e não abre em e-mail", async () => {
    const { user, field } = setup();
    await user.type(field, "@");
    await screen.findByRole("listbox");
    await user.keyboard("{Backspace}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    await user.type(field, "ana@empresa");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("sem resultado, avisa que ninguém foi encontrado e Enter envia a mensagem como texto", async () => {
    fetchMock.mockResolvedValue(reply([]));
    action.mockResolvedValue({ status: "error", message: "x" });
    const { user, field } = setup();
    await user.type(field, "@zz");
    expect(await screen.findByText("Nenhuma pessoa encontrada")).toBeInTheDocument();
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    await user.keyboard("{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    expect(Object.fromEntries(action.mock.calls[0]![2])).toEqual({ texto: "@zz" });
  });

  it("avisa quando a busca falha, sem derrubar o campo", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    const { user, field } = setup();
    await user.type(field, "@");
    expect(await screen.findByText("Não foi possível buscar as pessoas.")).toBeInTheDocument();
    await user.type(field, "x");
    expect(field).toHaveValue("@x");
  });

  it("Enter com a lista fechada continua enviando", async () => {
    action.mockResolvedValue({ status: "error", message: "x" });
    const { user, field } = setup();
    await user.type(field, "oi{Enter}");
    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });
});
