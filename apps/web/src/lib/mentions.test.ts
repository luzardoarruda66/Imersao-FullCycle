import { activeMention, insertMention, splitMentions } from "./mentions";

describe("activeMention", () => {
  it("acha o @ aberto logo antes do cursor, no começo do texto ou depois de espaço", () => {
    expect(activeMention("@", 1)).toEqual({ start: 0, end: 1, term: "" });
    expect(activeMention("Bom dia, @", 10)).toEqual({ start: 9, end: 10, term: "" });
    expect(activeMention("oi @bi", 6)).toEqual({ start: 3, end: 6, term: "bi" });
    expect(activeMention("linha\n@ana", 10)).toEqual({ start: 6, end: 10, term: "ana" });
  });

  it("usa só o que vem antes do cursor", () => {
    expect(activeMention("oi @bia tudo", 5)).toEqual({ start: 3, end: 5, term: "b" });
  });

  it("não abre em e-mail, depois de palavra, nem com espaço depois do @", () => {
    expect(activeMention("ana@empresa", 11)).toBeNull();
    expect(activeMention("oi @bia tudo", 12)).toBeNull();
    expect(activeMention("oi @ bia", 8)).toBeNull();
    expect(activeMention("sem arroba", 10)).toBeNull();
  });

  it("para no primeiro caractere que não é de @usuário", () => {
    expect(activeMention("oi @jo!", 7)).toBeNull();
    expect(activeMention("oi @jo.silva", 12)).toEqual({ start: 3, end: 12, term: "jo.silva" });
  });

  it("aceita maiúsculas na digitação e devolve o termo em minúsculas", () => {
    expect(activeMention("@Bia", 4)).toEqual({ start: 0, end: 4, term: "bia" });
  });
});

describe("insertMention", () => {
  it("troca o @ digitado pelo @usuário escolhido, com um espaço depois, e põe o cursor depois dele", () => {
    expect(insertMention("Bom dia, @bi", { start: 9, end: 12 }, "bia")).toEqual({ text: "Bom dia, @bia ", caret: 14 });
  });

  it("mantém o que vem depois do cursor", () => {
    expect(insertMention("oi @b e mais", { start: 3, end: 5 }, "bia")).toEqual({ text: "oi @bia  e mais", caret: 8 });
  });
});

describe("splitMentions", () => {
  const mencoes = [{ id: "p2", usuario: "bia" }];

  it("destaca só o @usuário que veio em menções", () => {
    expect(splitMentions("oi @bia, e @caio", mencoes)).toEqual([
      { text: "oi " },
      { mention: { id: "p2", usuario: "bia" }, text: "@bia" },
      { text: ", e @caio" },
    ]);
  });

  it("destaca cada ocorrência e ignora @ colado a palavra", () => {
    expect(splitMentions("@bia @bia ana@bia.com", mencoes)).toEqual([
      { mention: { id: "p2", usuario: "bia" }, text: "@bia" },
      { text: " " },
      { mention: { id: "p2", usuario: "bia" }, text: "@bia" },
      { text: " ana@bia.com" },
    ]);
  });

  it("não parte o @usuário mais longo que contém o menções (@biatriz)", () => {
    expect(splitMentions("oi @biatriz", mencoes)).toEqual([{ text: "oi @biatriz" }]);
  });

  it("sem menções devolve o texto inteiro", () => {
    expect(splitMentions("oi @bia", [])).toEqual([{ text: "oi @bia" }]);
    expect(splitMentions("", mencoes)).toEqual([]);
  });

  it("reconhece o @usuário seguido de pontuação", () => {
    expect(splitMentions("valeu @bia.", mencoes)).toEqual([
      { text: "valeu " },
      { mention: { id: "p2", usuario: "bia" }, text: "@bia" },
      { text: "." },
    ]);
  });
});
