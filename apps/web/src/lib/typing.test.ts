import { describe, expect, it } from "vitest";
import { TYPING_EXPIRE_MS, addTyper, pruneTypers, removeTyper, typingText, type TypingState } from "./typing";

const ana = { id: "p1", usuario: "ana" };
const bia = { id: "p2", usuario: "bia" };
const empty: TypingState = {};

describe("typingText", () => {
  it("nada quando ninguém digita", () => {
    expect(typingText(empty, "c1")).toBeNull();
  });
  it("uma pessoa: @usuário está digitando", () => {
    expect(typingText(addTyper(empty, "c1", ana, 0), "c1")).toBe("@ana está digitando");
  });
  it("mais de uma: Há N pessoas digitando...", () => {
    const state = addTyper(addTyper(empty, "c1", ana, 0), "c1", bia, 0);
    expect(typingText(state, "c1")).toBe("Há 2 pessoas digitando...");
  });
  it("o aviso de uma conversa não aparece em outra", () => {
    expect(typingText(addTyper(empty, "c1", ana, 0), "c2")).toBeNull();
  });
});

describe("expiração", () => {
  it("o aviso some em 5 s sem novo evento", () => {
    const state = addTyper(empty, "c1", ana, 1000);
    expect(typingText(pruneTypers(state, 1000 + TYPING_EXPIRE_MS - 1), "c1")).toBe("@ana está digitando");
    expect(typingText(pruneTypers(state, 1000 + TYPING_EXPIRE_MS), "c1")).toBeNull();
  });
  it("um novo evento da mesma pessoa renova o prazo, sem contá-la duas vezes", () => {
    let state = addTyper(empty, "c1", ana, 0);
    state = addTyper(state, "c1", ana, 4000);
    expect(typingText(pruneTypers(state, 8000), "c1")).toBe("@ana está digitando");
    expect(typingText(pruneTypers(state, 9000), "c1")).toBeNull();
  });
  it("expira só quem passou do prazo", () => {
    let state = addTyper(empty, "c1", ana, 0);
    state = addTyper(state, "c1", bia, 3000);
    expect(typingText(pruneTypers(state, 5000), "c1")).toBe("@bia está digitando");
  });
});

describe("removeTyper", () => {
  it("a mensagem do autor tira o aviso dele", () => {
    const state = addTyper(empty, "c1", ana, 0);
    expect(typingText(removeTyper(state, "c1", "p1"), "c1")).toBeNull();
  });
  it("deixa quem continua digitando", () => {
    const state = addTyper(addTyper(empty, "c1", ana, 0), "c1", bia, 0);
    expect(typingText(removeTyper(state, "c1", "p1"), "c1")).toBe("@bia está digitando");
  });
  it("devolve o mesmo estado quando a pessoa não estava digitando", () => {
    const state = addTyper(empty, "c1", ana, 0);
    expect(removeTyper(state, "c1", "p9")).toBe(state);
  });
});
