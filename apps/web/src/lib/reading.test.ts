import { describe, expect, it, vi } from "vitest";
import { fetchMessagePage, nextReadTarget } from "./reading";

describe("nextReadTarget", () => {
  const base = { visible: true, atBottom: true, lastMessageId: "m9", lastSentId: null as string | null };

  it("aba visível com a rolagem no fim lê até a última mensagem carregada", () => {
    expect(nextReadTarget(base)).toBe("m9");
  });
  it("aba escondida não lê", () => {
    expect(nextReadTarget({ ...base, visible: false })).toBeNull();
  });
  it("rolagem no meio não lê", () => {
    expect(nextReadTarget({ ...base, atBottom: false })).toBeNull();
  });
  it("conversa sem mensagem não lê", () => {
    expect(nextReadTarget({ ...base, lastMessageId: null })).toBeNull();
  });
  it("não repete a leitura da mesma mensagem", () => {
    expect(nextReadTarget({ ...base, lastSentId: "m9" })).toBeNull();
  });
  it("lê de novo quando chega mensagem mais nova", () => {
    expect(nextReadTarget({ ...base, lastSentId: "m8" })).toBe("m9");
  });
});

describe("fetchMessagePage", () => {
  const page = { mensagens: [], tem_mais: false };
  const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });

  it("pede a página anterior com a âncora certa, na rota do BFF", async () => {
    const fetchImpl = ok(page);
    await fetchMessagePage("c 1", "m/5", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith("/api/conversas/c%201/mensagens?antes=m%2F5", { credentials: "same-origin" });
  });
  it("devolve as mensagens e se há mais", async () => {
    const message = {
      id: "m1",
      conversa_id: "c1",
      autor: { id: "p1", nome: "Ana", usuario: "ana" },
      texto: "oi",
      criada_em: "2026-11-24T10:00:00.000Z",
    };
    const body = { mensagens: [message], tem_mais: true };
    expect(await fetchMessagePage("c1", "m2", ok(body))).toEqual(body);
  });
  it("rejeita quando a resposta não é de sucesso", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({}) });
    await expect(fetchMessagePage("c1", "m2", fetchImpl)).rejects.toThrow();
  });
  it("rejeita quando a rede falha", async () => {
    await expect(fetchMessagePage("c1", "m2", vi.fn().mockRejectedValue(new Error("rede")))).rejects.toThrow();
  });
  it("rejeita resposta fora do formato", async () => {
    await expect(fetchMessagePage("c1", "m2", ok({ lixo: true }))).rejects.toThrow();
  });
});
