import { interpretResponse } from "./chat-api-response";

const errorBody = (code: string, details?: object) => ({ error: { code, message: "m", details } });

describe("interpretResponse", () => {
  it("devolve os dados num 2xx", () => {
    expect(interpretResponse(201, { id: "1" })).toEqual({ kind: "ok", status: 201, data: { id: "1" } });
    expect(interpretResponse(204, undefined)).toEqual({ kind: "ok", status: 204, data: undefined });
  });

  it("traduz sessao_invalida em sessão inválida", () => {
    expect(interpretResponse(401, errorBody("sessao_invalida"))).toEqual({ kind: "invalid-session" });
    expect(interpretResponse(401, null)).toEqual({ kind: "invalid-session" });
  });

  it("traduz 5xx em indisponível, e não em sessão inválida", () => {
    expect(interpretResponse(500, errorBody("erro_interno"))).toEqual({ kind: "unavailable" });
    expect(interpretResponse(503, "<html>")).toEqual({ kind: "unavailable" });
  });

  it("mantém o código e os detalhes dos erros de negócio", () => {
    expect(interpretResponse(401, errorBody("credenciais_invalidas"))).toMatchObject({ kind: "error", code: "credenciais_invalidas" });
    expect(interpretResponse(429, errorBody("tentativas_demais", { segundos_restantes: 840 }))).toMatchObject({
      kind: "error",
      status: 429,
      code: "tentativas_demais",
      details: { segundos_restantes: 840 },
    });
    expect(interpretResponse(422, errorBody("senha_fraca", { regras_faltando: ["numero"] }))).toMatchObject({
      code: "senha_fraca",
      details: { regras_faltando: ["numero"] },
    });
  });
});
