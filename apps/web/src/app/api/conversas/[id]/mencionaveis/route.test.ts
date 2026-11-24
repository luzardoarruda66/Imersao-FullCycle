import { clearSessionCookie } from "@/server/chat-api";
import { getMentionable } from "@/server/conversations";
import { GET } from "./route";

vi.mock("@/server/conversations", () => ({ getMentionable: vi.fn() }));
vi.mock("@/server/chat-api", () => ({ clearSessionCookie: vi.fn() }));
const mentionable = vi.mocked(getMentionable);
const clear = vi.mocked(clearSessionCookie);

const call = (query = "", id = "c1") =>
  GET(new Request(`http://localhost/api/conversas/${id}/mencionaveis${query}`), { params: Promise.resolve({ id }) } as never);

describe("GET /api/conversas/[id]/mencionaveis", () => {
  beforeEach(() => {
    mentionable.mockReset();
    clear.mockReset();
  });

  it("devolve só id, nome e @usuário e repassa a conversa e o termo", async () => {
    mentionable.mockResolvedValue({
      kind: "ok",
      status: 200,
      data: { pessoas: [{ id: "1", nome: "Bia", usuario: "bia", email: "bia@empresa.com" } as never] },
    });
    const res = await call("?busca=bi");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pessoas: [{ id: "1", nome: "Bia", usuario: "bia" }] });
    expect(mentionable).toHaveBeenCalledWith("c1", "bi");
  });

  it("busca ausente chama a API com o termo vazio", async () => {
    mentionable.mockResolvedValue({ kind: "ok", status: 200, data: { pessoas: [] } });
    await call();
    expect(mentionable).toHaveBeenCalledWith("c1", "");
  });

  it("recusa o parâmetro repetido sem chamar a API", async () => {
    const res = await call("?busca=a&busca=b");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("dados_invalidos");
    expect(mentionable).not.toHaveBeenCalled();
  });

  it("com a sessão inválida, apaga o cookie e responde 401", async () => {
    mentionable.mockResolvedValue({ kind: "invalid-session" });
    const res = await call("?busca=a");
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("sessao_invalida");
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("com a API fora do ar, responde 503 e mantém o cookie", async () => {
    mentionable.mockResolvedValue({ kind: "unavailable" });
    const res = await call("?busca=a");
    expect(res.status).toBe(503);
    expect(clear).not.toHaveBeenCalled();
  });

  it("conversa alheia ou inexistente passa o código e o status da API", async () => {
    mentionable.mockResolvedValue({ kind: "error", status: 404, code: "conversa_inexistente", message: "x" });
    const res = await call("?busca=a");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("conversa_inexistente");
  });
});
