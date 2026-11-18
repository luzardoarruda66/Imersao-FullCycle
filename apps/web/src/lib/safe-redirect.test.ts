import { entrarPath, safeNext } from "./safe-redirect";

describe("entrarPath", () => {
  it("guarda o destino pedido na URL de Entrar", () => {
    expect(entrarPath("/c/1?m=2")).toBe("/entrar?para=%2Fc%2F1%3Fm%3D2");
  });
  it("sem destino, ou com destino inseguro, vai só para Entrar", () => {
    expect(entrarPath("/")).toBe("/entrar");
    expect(entrarPath("//outro.com")).toBe("/entrar");
  });
});

describe("safeNext", () => {
  it("aceita um caminho do produto, com query e hash", () => {
    expect(safeNext("/canais/geral")).toBe("/canais/geral");
    expect(safeNext("/c/1?mensagem=2#topo")).toBe("/c/1?mensagem=2#topo");
  });

  it.each([
    ["//outro.com", "protocolo relativo"],
    ["/\\outro.com", "barra invertida"],
    ["/\t/outro.com", "tab que o navegador ignora"],
    ["https://outro.com", "URL absoluta"],
    ["javascript:alert(1)", "esquema perigoso"],
    ["", "vazio"],
    ["entrar", "sem barra inicial"],
  ])("manda %j (%s) para a tela principal", (value) => {
    expect(safeNext(value)).toBe("/");
  });

  it("manda o que não é texto para a tela principal", () => {
    expect(safeNext(undefined)).toBe("/");
    expect(safeNext(null)).toBe("/");
    expect(safeNext(["/a"])).toBe("/");
  });
});
