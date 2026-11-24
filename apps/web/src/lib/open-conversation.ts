/**
 * A conversa aberta que a aba está lendo agora (visível e com a rolagem no fim). A lateral consulta aqui para não
 * mostrar selo novo no que já está sendo lido, enquanto a leitura viaja ao servidor (LLD, "Cliente").
 */
let reading: string | null = null;

export function setReadingConversation(conversationId: string | null) {
  reading = conversationId;
}

export function isReadingConversation(conversationId: string): boolean {
  return reading === conversationId;
}
