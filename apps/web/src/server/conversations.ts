import "server-only";
import type { ChatMessage } from "chat-events";
import { cache } from "react";
import type { ApiResult } from "@/lib/chat-api-response";
import type { ConversationDetail, ConversationList, MemberOption } from "@/lib/conversations";
import { callChatApi } from "./chat-api";

/**
 * Leituras das conversas na API do chat. Cada uma devolve o resultado já traduzido (`ok`, sessão inválida,
 * API fora do ar ou erro de negócio), e quem chama decide a tela. Só o que a tela usa sai daqui.
 */

/** A lista de conversas do membro; a mesma chamada serve ao layout e à página na mesma requisição. */
export const getConversationList = cache(async (): Promise<ApiResult<ConversationList>> => {
  return callChatApi<ConversationList>("/v1/conversas");
});

/** Os membros do workspace, só id e nome. */
export const getMembers = cache(async (): Promise<ApiResult<MemberOption[]>> => {
  const result = await callChatApi<{ membros: MemberOption[] }>("/v1/membros");
  return result.kind === "ok" ? { ...result, data: result.data.membros } : result;
});

export async function getConversation(id: string): Promise<ApiResult<ConversationDetail>> {
  return callChatApi<ConversationDetail>(`/v1/conversas/${encodeURIComponent(id)}`);
}

/** As 50 mensagens mais recentes, da mais antiga para a mais nova. */
export async function getMessages(id: string): Promise<ApiResult<ChatMessage[]>> {
  const result = await callChatApi<{ mensagens: ChatMessage[] }>(`/v1/conversas/${encodeURIComponent(id)}/mensagens`);
  return result.kind === "ok" ? { ...result, data: result.data.mensagens } : result;
}
