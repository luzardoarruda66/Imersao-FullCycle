import { callChatApi } from "@/server/chat-api";
import { sendMessageAction } from "./conversations";

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
