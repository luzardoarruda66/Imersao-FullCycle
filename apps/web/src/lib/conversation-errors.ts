const MESSAGES: Record<string, string> = {
  nome_canal_em_uso: "Já existe um canal com esse nome.",
  conversa_direta_consigo_mesmo: "Você não pode abrir uma conversa direta com você mesmo.",
  conversa_nao_aceita_convite: "Só é possível convidar pessoas para um canal privado.",
  conversa_inexistente: "Esta conversa não existe ou você não participa dela.",
  prazo_encerrado: "O prazo de 4 horas para editar esta mensagem acabou.",
  mensagem_apagada: "Esta mensagem foi apagada.",
  mensagem_de_outra_pessoa: "Só quem escreveu a mensagem pode editá-la.",
  mensagem_inexistente: "Esta mensagem não existe mais.",
};

const FALLBACK = "Não foi possível concluir. Confira sua conexão e tente de novo.";

/** Tradução dos códigos de erro das conversas em mensagem de tela (catálogo do snapshot OpenAPI da API do chat). */
export function conversationErrorMessage(code: string, fallback: string = FALLBACK): string {
  return MESSAGES[code] ?? fallback;
}
