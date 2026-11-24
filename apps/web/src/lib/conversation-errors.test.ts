import { conversationErrorMessage } from "./conversation-errors";

describe("conversationErrorMessage", () => {
  it("traduz cada código novo da API em mensagem de tela", () => {
    expect(conversationErrorMessage("nome_canal_em_uso")).toBe("Já existe um canal com esse nome.");
    expect(conversationErrorMessage("conversa_direta_consigo_mesmo")).toBe("Você não pode abrir uma conversa direta com você mesmo.");
    expect(conversationErrorMessage("conversa_nao_aceita_convite")).toBe("Só é possível convidar pessoas para um canal privado.");
    expect(conversationErrorMessage("conversa_inexistente")).toBe("Esta conversa não existe ou você não participa dela.");
  });

  it("usa a mensagem geral do contexto quando o código não é conhecido", () => {
    expect(conversationErrorMessage("erro_estranho", "Não foi possível criar o canal. Tente de novo.")).toBe(
      "Não foi possível criar o canal. Tente de novo.",
    );
  });

  it("tem uma mensagem de reserva sem contexto", () => {
    expect(conversationErrorMessage("erro_estranho")).toBe("Não foi possível concluir. Confira sua conexão e tente de novo.");
  });
});
