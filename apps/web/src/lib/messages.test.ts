import type { ChatMessage } from "chat-events";
import { applyEdit, canEdit, EDIT_WINDOW_MS, excerptOf, dayLabel, formatTime, groupByDay, mergeMessages } from "./messages";

const message = (id: string, criadaEm: string, texto = id): ChatMessage => ({
  id,
  conversa_id: "c1",
  autor: { id: "p1", nome: "Ana", usuario: "ana" },
  texto,
  criada_em: criadaEm,
  mencoes: [], citacao: null, editada_em: null, apagada: false,
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

describe("excerptOf", () => {
  it("deixa o texto até 140 caracteres como está e corta o maior, com reticências", () => {
    expect(excerptOf("curto")).toBe("curto");
    expect(excerptOf("b".repeat(140))).toBe("b".repeat(140));
    expect(excerptOf("a".repeat(141))).toBe(`${"a".repeat(140)}…`);
  });

  it("conta caracteres de verdade, sem partir um emoji", () => {
    expect(excerptOf("😀".repeat(150))).toBe(`${"😀".repeat(140)}…`);
  });
});

describe("canEdit", () => {
  const sent = Date.parse("2026-11-24T10:00:00.000Z");
  const own = { autor: { id: "p1" }, criada_em: new Date(sent).toISOString(), apagada: false } as ChatMessage;

  it("só o autor edita, até 4 horas depois do envio, inclusive", () => {
    expect(canEdit(own, "p1", sent)).toBe(true);
    expect(canEdit(own, "p1", sent + EDIT_WINDOW_MS)).toBe(true);
    expect(canEdit(own, "p1", sent + EDIT_WINDOW_MS + 1)).toBe(false);
    expect(canEdit(own, "p2", sent)).toBe(false);
    expect(canEdit(own, undefined, sent)).toBe(false);
  });

  it("nunca edita mensagem apagada", () => {
    expect(canEdit({ ...own, apagada: true }, "p1", sent)).toBe(false);
  });

  it("o prazo é de 4 horas", () => {
    expect(EDIT_WINDOW_MS).toBe(4 * 60 * 60 * 1000);
  });
});

describe("applyEdit", () => {
  const base = (id: string, texto: string, over: Partial<ChatMessage> = {}): ChatMessage => ({
    id,
    conversa_id: "c1",
    autor: { id: "p1", nome: "Ana", usuario: "ana" },
    texto,
    criada_em: "2026-11-24T10:00:00.000Z",
    mencoes: [],
    citacao: null,
    editada_em: null,
    apagada: false,
    ...over,
  });
  const quoteOf = (id: string, trecho: string, apagada = false) => ({ id, autor: { id: "p1", nome: "Ana", usuario: "ana" }, trecho, apagada });

  it("troca a mensagem pelo id e deixa as outras como estão", () => {
    const current = [base("m1", "antigo"), base("m2", "outra")];
    const edited = base("m1", "novo", { editada_em: "2026-11-24T10:05:00.000Z" });
    const next = applyEdit(current, edited);
    expect(next).toEqual([edited, current[1]]);
    expect(next[1]).toBe(current[1]);
  });

  it("não faz nada, e devolve a mesma lista, quando a mensagem não está carregada", () => {
    const current = [base("m1", "antigo")];
    expect(applyEdit(current, base("m9", "novo"))).toBe(current);
  });

  it("a mesma edição entregue duas vezes dá o mesmo resultado", () => {
    const current = [base("m1", "antigo")];
    const edited = base("m1", "novo", { editada_em: "2026-11-24T10:05:00.000Z" });
    expect(applyEdit(applyEdit(current, edited), edited)).toEqual([edited]);
  });

  it("as citações carregadas à mensagem editada passam a mostrar o texto novo, cortado em 140", () => {
    const current = [base("m1", "antigo"), base("m2", "resposta", { citacao: quoteOf("m1", "antigo") }), base("m3", "outra", { citacao: quoteOf("m0", "x") })];
    const next = applyEdit(current, base("m1", "y".repeat(200)));
    expect(next[1]!.citacao!.trecho).toBe(`${"y".repeat(140)}…`);
    expect(next[2]).toBe(current[2]);
  });

  it("ignora uma edição mais velha que a já mostrada (eventos fora de ordem) e a de mensagem apagada", () => {
    const newer = base("m1", "segunda edição", { editada_em: "2026-11-24T10:06:00.000Z" });
    const current = [newer];
    expect(applyEdit(current, base("m1", "primeira edição", { editada_em: "2026-11-24T10:05:00.000Z" }))).toBe(current);
    const deleted = [base("m1", "", { apagada: true })];
    expect(applyEdit(deleted, base("m1", "ressuscitada", { editada_em: "2026-11-24T10:07:00.000Z" }))).toBe(deleted);
  });

  it("não reescreve a citação de uma mensagem apagada", () => {
    const current = [base("m1", "antigo"), base("m2", "r", { citacao: quoteOf("m1", "", true) })];
    expect(applyEdit(current, base("m1", "novo"))[1]!.citacao).toEqual(quoteOf("m1", "", true));
  });
});
