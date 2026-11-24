import { clearSessionCookie } from "@/server/chat-api";
import { searchPeople } from "@/server/people";
import { GET } from "./route";

vi.mock("@/server/people", () => ({ searchPeople: vi.fn() }));
vi.mock("@/server/chat-api", () => ({ clearSessionCookie: vi.fn() }));
const search = vi.mocked(searchPeople);
const clear = vi.mocked(clearSessionCookie);

const call = (query = "") => GET(new Request(`http://localhost/api/pessoas${query}`));

describe("GET /api/pessoas", () => {
  beforeEach(() => {
    search.mockReset();
    clear.mockReset();
  });

  it("devolve só id, nome e @usuário de cada resultado", async () => {
    search.mockResolvedValue({
      kind: "ok",
      status: 200,
      data: { pessoas: [{ id: "1", nome: "Ana", usuario: "ana", email: "ana@empresa.com", administrador: true } as never] },
    });
    const res = await call("?busca=an");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ pessoas: [{ id: "1", nome: "Ana", usuario: "ana" }] });
    expect(search).toHaveBeenCalledWith("an");
  });

  it("busca vazia ou ausente chama a API com o termo vazio", async () => {
    search.mockResolvedValue({ kind: "ok", status: 200, data: { pessoas: [] } });
    await call();
    await call("?busca=");
    expect(search.mock.calls).toEqual([[""], [""]]);
  });

  it("recusa o parâmetro repetido sem chamar a API", async () => {
    const res = await call("?busca=a&busca=b");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("dados_invalidos");
    expect(search).not.toHaveBeenCalled();
  });

  it("com a sessão inválida, apaga o cookie e responde 401", async () => {
    search.mockResolvedValue({ kind: "invalid-session" });
    const res = await call("?busca=a");
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("sessao_invalida");
    expect(clear).toHaveBeenCalledTimes(1);
  });

  it("com a API fora do ar, responde 503 e mantém o cookie", async () => {
    search.mockResolvedValue({ kind: "unavailable" });
    const res = await call("?busca=a");
    expect(res.status).toBe(503);
    expect(clear).not.toHaveBeenCalled();
  });

  it("repassa um erro de negócio da API como falha, sem o corpo da API", async () => {
    search.mockResolvedValue({ kind: "error", status: 400, code: "dados_invalidos", message: "ruim" });
    const res = await call("?busca=a");
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: { code: "erro_na_busca" } });
  });
});
