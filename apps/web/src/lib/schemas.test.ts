import {
  changePasswordSchema,
  createChannelSchema,
  fieldErrorsOf,
  inviteSchema,
  openDirectSchema,
  sendMessageSchema,
  signInSchema,
} from "./schemas";

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

describe("createChannelSchema", () => {
  it("aceita o nome sem os espaços das pontas e um dos dois tipos", () => {
    const result = createChannelSchema.safeParse({ nome: "  geral ", tipo: "publico" });
    expect(result.success && result.data).toEqual({ nome: "geral", tipo: "publico" });
    expect(createChannelSchema.safeParse({ nome: "x".repeat(80), tipo: "privado" }).success).toBe(true);
  });

  it("recusa o nome em branco ou com mais de 80 caracteres, cada um com a sua mensagem", () => {
    const blank = createChannelSchema.safeParse({ nome: "   ", tipo: "publico" });
    expect(!blank.success && fieldErrorsOf(blank.error)).toEqual({ nome: "Informe um nome de 1 a 80 caracteres." });
    const long = createChannelSchema.safeParse({ nome: "x".repeat(81), tipo: "publico" });
    expect(!long.success && fieldErrorsOf(long.error)).toEqual({ nome: "O nome pode ter no máximo 80 caracteres." });
  });

  it("recusa quando o tipo não foi escolhido, com e sem valor", () => {
    for (const tipo of ["", undefined, "secreto"]) {
      const result = createChannelSchema.safeParse({ nome: "geral", tipo });
      expect(!result.success && fieldErrorsOf(result.error)).toEqual({ tipo: "Escolha se o canal é público ou privado." });
    }
  });
});

describe("sendMessageSchema", () => {
  it("aceita o texto aparado, até 4.000 caracteres", () => {
    const result = sendMessageSchema.safeParse({ texto: "  oi  " });
    expect(result.success && result.data.texto).toBe("oi");
    expect(sendMessageSchema.safeParse({ texto: "a".repeat(4000) }).success).toBe(true);
  });

  it("recusa a mensagem vazia, só de espaços e com mais de 4.000 caracteres", () => {
    for (const texto of ["", "   ", "\n"]) {
      const result = sendMessageSchema.safeParse({ texto });
      expect(!result.success && fieldErrorsOf(result.error)).toEqual({ texto: "Escreva uma mensagem." });
    }
    const long = sendMessageSchema.safeParse({ texto: "a".repeat(4001) });
    expect(!long.success && fieldErrorsOf(long.error).texto).toMatch(/4\.000 caracteres/);
  });
});

describe("inviteSchema e openDirectSchema", () => {
  const id = "0192f4a0-0000-7000-8000-000000000001";

  it("o convite pede pelo menos uma pessoa, com ids válidos", () => {
    expect(inviteSchema.safeParse({ membrosIds: [id] }).success).toBe(true);
    const none = inviteSchema.safeParse({ membrosIds: [] });
    expect(!none.success && fieldErrorsOf(none.error)).toEqual({ membrosIds: "Escolha pelo menos uma pessoa." });
    expect(inviteSchema.safeParse({ membrosIds: ["x"] }).success).toBe(false);
  });

  it("a conversa direta pede o id de um membro", () => {
    expect(openDirectSchema.safeParse({ membroId: id }).success).toBe(true);
    expect(openDirectSchema.safeParse({ membroId: "" }).success).toBe(false);
  });
});
