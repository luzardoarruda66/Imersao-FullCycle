import { callChatApi } from "@/server/chat-api";
import { editMessageAction, sendMessageAction } from "./conversations";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/server/chat-api", () => ({ callChatApi: vi.fn(), clearSessionCookie: vi.fn() }));
vi.mock("@/server/conversations", () => ({ markConversationRead: vi.fn() }));
const api = vi.mocked(callChatApi);

const QUOTE = "0192f4a0-0000-7000-8000-000000000001";
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};
const sent = { id: "m1", texto: "oi" };

describe("sendMessageAction", () => {
  beforeEach(() => {
    api.mockReset();
    api.mockResolvedValue({ kind: "ok", status: 201, data: sent as never });
  });

  it("envia só o texto quando não há citação", async () => {
    const result = await sendMessageAction("c1", { status: "idle" }, form({ texto: "  oi  " }));
    expect(result).toEqual({ status: "sent", message: sent });
    expect(api).toHaveBeenCalledWith("/v1/conversas/c1/mensagens", { method: "POST", body: { texto: "oi" } });
  });

  it("leva o citacao_id quando a mensagem cita outra", async () => {
    await sendMessageAction("c1", { status: "idle" }, form({ texto: "oi", citacao_id: QUOTE }));
    expect(api).toHaveBeenCalledWith("/v1/conversas/c1/mensagens", { method: "POST", body: { texto: "oi", citacao_id: QUOTE } });
  });

  it("trata o campo de citação vazio como sem citação", async () => {
    await sendMessageAction("c1", { status: "idle" }, form({ texto: "oi", citacao_id: "" }));
    expect(api.mock.calls[0]![1]).toEqual({ method: "POST", body: { texto: "oi" } });
  });

  it("recusa um citacao_id que não é UUID sem chamar a API", async () => {
    const result = await sendMessageAction("c1", { status: "idle" }, form({ texto: "oi", citacao_id: "xyz" }));
    expect(result.status).toBe("error");
    expect(api).not.toHaveBeenCalled();
  });

  it("se a API recusa a citação, diz que a mensagem citada não está mais disponível e mantém o texto", async () => {
    api.mockResolvedValue({ kind: "error", status: 400, code: "dados_invalidos", message: "x" });
    const result = await sendMessageAction("c1", { status: "idle" }, form({ texto: "oi", citacao_id: QUOTE }));
    expect(result).toEqual({
      status: "error",
      message: "A mensagem citada não está mais disponível. Cancele a citação ou escolha outra mensagem. O texto foi mantido.",
    });
  });
});

describe("editMessageAction", () => {
  const edited = { id: "m1", texto: "novo" };
  const call = (texto: string) => editMessageAction("c1", "m1", texto);
  beforeEach(() => {
    api.mockReset();
    api.mockResolvedValue({ kind: "ok", status: 200, data: edited as never });
  });

  it("pede a edição na rota da mensagem e devolve a mensagem gravada", async () => {
    expect(await call("  novo  ")).toEqual({ status: "edited", message: edited });
    expect(api).toHaveBeenCalledWith("/v1/conversas/c1/mensagens/m1", { method: "PATCH", body: { texto: "novo" } });
  });

  it("recusa texto vazio ou acima de 4.000 caracteres sem chamar a API", async () => {
    expect((await call("   ")).status).toBe("error");
    expect(await call("x".repeat(4001))).toEqual({ status: "error", message: "A mensagem passa de 4.000 caracteres. Divida o texto em mais de uma mensagem." });
    expect(api).not.toHaveBeenCalled();
  });

  it.each([
    ["prazo_encerrado", "O prazo de 4 horas para editar esta mensagem acabou."],
    ["mensagem_apagada", "Esta mensagem foi apagada."],
    ["mensagem_de_outra_pessoa", "Só quem escreveu a mensagem pode editá-la."],
    ["mensagem_inexistente", "Esta mensagem não existe mais."],
  ])("traduz %s em mensagem de tela", async (code, message) => {
    api.mockResolvedValue({ kind: "error", status: 422, code, message: "x" });
    expect(await call("novo")).toEqual({ status: "error", message });
  });

  it("com a API fora do ar, diz para tentar de novo e mantém o texto", async () => {
    api.mockResolvedValue({ kind: "unavailable" });
    const result = await call("novo");
    expect(result).toEqual({ status: "error", message: "Não foi possível salvar a edição. Verifique a conexão e tente de novo. O texto foi mantido." });
  });
});
