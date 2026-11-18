import { parseSetCookie } from "./set-cookie";

describe("parseSetCookie", () => {
  it("lê nome, valor e atributos do cookie de sessão", () => {
    expect(parseSetCookie("sid=abc%2Fdef; Max-Age=3153600000; Path=/; HttpOnly; Secure; SameSite=Lax")).toEqual({
      name: "sid",
      value: "abc/def",
      options: { maxAge: 3153600000, path: "/", httpOnly: true, secure: true, sameSite: "lax" },
    });
  });

  it("lê o cookie que expira a sessão", () => {
    const cookie = parseSetCookie("sid=; Max-Age=0; Path=/; Domain=exemplo.com; HttpOnly");
    expect(cookie).toMatchObject({ name: "sid", value: "", options: { maxAge: 0, domain: "exemplo.com" } });
  });

  it("devolve nulo para um cabeçalho sem nome", () => {
    expect(parseSetCookie("=x")).toBeNull();
    expect(parseSetCookie("")).toBeNull();
  });
});
