import type { ChatMessage } from "chat-events";
import { dayLabel, formatTime, groupByDay, mergeMessages } from "./messages";

const message = (id: string, criadaEm: string, texto = id): ChatMessage => ({
  id,
  conversa_id: "c1",
  autor: { id: "p1", nome: "Ana" },
  texto,
  criada_em: criadaEm,
});

describe("mergeMessages", () => {
  it("junta sem repetir a mesma mensagem, vinda do servidor e do tempo real", () => {
    const a = message("a", "2026-11-24T10:00:00.000Z");
    const b = message("b", "2026-11-24T10:01:00.000Z");
    expect(mergeMessages([a], [a, b])).toEqual([a, b]);
    expect(mergeMessages([a, b], [b])).toEqual([a, b]);
  });

  it("mantém a ordem cronológica, e o identificador desempata o mesmo instante", () => {
    const late = message("z", "2026-11-24T10:05:00.000Z");
    const early = message("a", "2026-11-24T10:00:00.000Z");
    expect(mergeMessages([late], [early]).map((m) => m.id)).toEqual(["a", "z"]);
    const same1 = message("m1", "2026-11-24T10:00:00.000Z");
    const same2 = message("m2", "2026-11-24T10:00:00.000Z");
    expect(mergeMessages([same2], [same1]).map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("a versão nova da mesma mensagem substitui a velha e a entrada não é alterada", () => {
    const old = message("a", "2026-11-24T10:00:00.000Z", "antes");
    const fresh = message("a", "2026-11-24T10:00:00.000Z", "depois");
    const current = [old];
    expect(mergeMessages(current, [fresh])[0]!.texto).toBe("depois");
    expect(current[0]!.texto).toBe("antes");
  });
});

describe("dayLabel", () => {
  const now = new Date(2026, 10, 24, 15, 0); // 24 de novembro de 2026, hora local

  it("chama o dia de hoje de Hoje e o de ontem de Ontem", () => {
    expect(dayLabel(new Date(2026, 10, 24, 8, 0), now)).toBe("Hoje");
    expect(dayLabel(new Date(2026, 10, 23, 23, 59), now)).toBe("Ontem");
  });

  it("escreve a data dos outros dias, com o ano só quando não é o atual", () => {
    expect(dayLabel(new Date(2026, 10, 20, 12, 0), now)).toBe("20 de novembro");
    expect(dayLabel(new Date(2025, 11, 31, 12, 0), now)).toBe("31 de dezembro de 2025");
  });
});

describe("formatTime", () => {
  it("mostra hora e minuto em 24 horas, na hora local", () => {
    expect(formatTime(new Date(2026, 10, 24, 8, 5))).toBe("08:05");
    expect(formatTime(new Date(2026, 10, 24, 17, 30))).toBe("17:30");
  });
});

describe("groupByDay", () => {
  it("agrupa as mensagens seguidas do mesmo dia local, na ordem recebida", () => {
    const d1 = new Date(2026, 10, 23, 10, 0).toISOString();
    const d2 = new Date(2026, 10, 23, 11, 0).toISOString();
    const d3 = new Date(2026, 10, 24, 9, 0).toISOString();
    const groups = groupByDay([message("a", d1), message("b", d2), message("c", d3)], new Date(2026, 10, 24, 15, 0));
    expect(groups.map((g) => [g.label, g.messages.map((m) => m.id)])).toEqual([
      ["Ontem", ["a", "b"]],
      ["Hoje", ["c"]],
    ]);
  });

  it("devolve nada para nenhuma mensagem", () => {
    expect(groupByDay([], new Date())).toEqual([]);
  });
});
