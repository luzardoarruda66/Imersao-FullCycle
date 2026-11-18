import { changePasswordSchema, fieldErrorsOf, signInSchema } from "./schemas";

describe("signInSchema", () => {
  it("aceita e-mail com espaços nas pontas, aparando-os", () => {
    const result = signInSchema.safeParse({ email: "  Ana@Empresa.com ", senha: "x" });
    expect(result.success && result.data.email).toBe("Ana@Empresa.com");
  });

  it("recusa campos em branco e e-mail malformado, com a mensagem de cada campo", () => {
    const blank = signInSchema.safeParse({ email: " ", senha: "" });
    expect(!blank.success && fieldErrorsOf(blank.error)).toEqual({
      email: "Informe um e-mail válido, como nome@empresa.com.",
      senha: "Informe sua senha.",
    });
    const malformed = signInSchema.safeParse({ email: "ana@", senha: "x" });
    expect(!malformed.success && fieldErrorsOf(malformed.error)).toEqual({ email: "Informe um e-mail válido, como nome@empresa.com." });
  });
});

describe("changePasswordSchema", () => {
  it("aceita quando a confirmação bate com a nova senha", () => {
    expect(changePasswordSchema.safeParse({ senhaAtual: "a", novaSenha: "B1!bbbbb", confirmacao: "B1!bbbbb" }).success).toBe(true);
  });

  it("recusa a confirmação diferente da nova senha", () => {
    const result = changePasswordSchema.safeParse({ senhaAtual: "a", novaSenha: "B1!bbbbb", confirmacao: "outra" });
    expect(!result.success && fieldErrorsOf(result.error)).toEqual({ confirmacao: "As senhas não são iguais." });
  });

  it("recusa campos em branco", () => {
    const result = changePasswordSchema.safeParse({ senhaAtual: "", novaSenha: "", confirmacao: "" });
    expect(!result.success && Object.keys(fieldErrorsOf(result.error))).toEqual(["senhaAtual", "novaSenha", "confirmacao"]);
  });
});
