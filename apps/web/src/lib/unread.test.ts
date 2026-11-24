import { describe, expect, it } from "vitest";
import type { ConversationList } from "./conversations";
import { badgeLabel, badgeText, setCounts } from "./unread";

describe("badgeText", () => {
  it.each([
    [0, null],
    [1, "1"],
    [99, "99"],
    [100, "99+"],
    [1500, "99+"],
  ])("%i vira %s", (count, text) => {
    expect(badgeText(count)).toBe(text);
  });
});

describe("badgeLabel", () => {
  it("diz o nome da conversa e a contagem de não lidas", () => {
    expect(badgeLabel("geral", 3, 0)).toBe("geral, 3 não lidas");
    expect(badgeLabel("geral", 1, 0)).toBe("geral, 1 não lida");
  });
  it("inclui as menções quando há", () => {
    expect(badgeLabel("geral", 3, 2)).toBe("geral, 3 não lidas, 2 menções");
    expect(badgeLabel("geral", 3, 1)).toBe("geral, 3 não lidas, 1 menção");
  });
  it("só o nome quando não há nada", () => {
    expect(badgeLabel("geral", 0, 0)).toBe("geral");
  });
  it("diz 99+ acima de 99, como o selo", () => {
    expect(badgeLabel("geral", 120, 0)).toBe("geral, 99+ não lidas");
  });
});

const list = (): ConversationList => ({
  canais_publicos: [{ id: "a", tipo: "canal_publico", nome: "geral", nao_lidas: 0, mencoes: 0 }],
  canais_privados: [{ id: "b", tipo: "canal_privado", nome: "fechado", nao_lidas: 2, mencoes: 0 }],
  diretas: [{ id: "c", tipo: "direta", nome: "Bia", nao_lidas: 1, mencoes: 0 }],
});

describe("setCounts", () => {
  it("grava as contagens da conversa, em qualquer seção, sem mexer nas outras", () => {
    const next = setCounts(list(), "c", { nao_lidas: 7, mencoes: 1 });
    expect(next.diretas[0]).toMatchObject({ nao_lidas: 7, mencoes: 1 });
    expect(next.canais_privados[0]).toMatchObject({ nao_lidas: 2 });
    expect(next.canais_publicos[0]).toMatchObject({ nao_lidas: 0 });
  });
  it("não muda a lista (nem cria linha) para uma conversa que ela não tem", () => {
    const original = list();
    expect(setCounts(original, "zzz", { nao_lidas: 1, mencoes: 0 })).toEqual(original);
  });
  it("devolve a mesma lista quando as contagens já são essas", () => {
    const original = list();
    expect(setCounts(original, "b", { nao_lidas: 2, mencoes: 0 })).toBe(original);
  });
});
