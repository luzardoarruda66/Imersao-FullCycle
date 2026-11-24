import { z } from "zod";
import { chatMessageSchema, type ChatMessage } from "chat-events";

/**
 * A mensagem até onde ler agora, ou `null` quando não se lê: só a aba visível, com a rolagem no fim, e só uma
 * mensagem que ainda não foi enviada como leitura (LLD, "Cliente", "Leituras e tempo real").
 */
export function nextReadTarget(input: {
  visible: boolean;
  atBottom: boolean;
  lastMessageId: string | null;
  lastSentId: string | null;
}): string | null {
  if (!input.visible || !input.atBottom || !input.lastMessageId) return null;
  return input.lastMessageId === input.lastSentId ? null : input.lastMessageId;
}

export interface MessagePage {
  mensagens: ChatMessage[];
  tem_mais: boolean;
}

const pageSchema = z.object({ mensagens: z.array(chatMessageSchema), tem_mais: z.boolean() });

/** Pede ao BFF a página de mensagens anterior à âncora; rejeita em qualquer falha, para a tela oferecer "Tentar de novo". */
export async function fetchMessagePage(
  conversationId: string,
  before: string,
  fetchImpl: (url: string, init: { credentials: "same-origin" }) => Promise<Pick<Response, "ok" | "status" | "json">> = fetch,
): Promise<MessagePage> {
  const url = `/api/conversas/${encodeURIComponent(conversationId)}/mensagens?antes=${encodeURIComponent(before)}`;
  const response = await fetchImpl(url, { credentials: "same-origin" });
  if (!response.ok) throw new Error(`Falha ao carregar o histórico (${response.status})`);
  return pageSchema.parse(await response.json());
}
