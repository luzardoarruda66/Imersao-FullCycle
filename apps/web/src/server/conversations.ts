import "server-only";
import type { ReadCounts } from "chat-events";
import { cache } from "react";
import type { ApiResult } from "@/lib/chat-api-response";
import type { ConversationDetail, ConversationList, MemberOption } from "@/lib/conversations";
import type { PersonSummary } from "@/lib/people";
import type { MessagePage } from "@/lib/reading";
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

/** Uma página de 50 mensagens, da mais antiga para a mais nova: as mais recentes, ou as anteriores à âncora `before`. */
export async function getMessages(id: string, before?: string): Promise<ApiResult<MessagePage>> {
  const query = before ? `?antes=${encodeURIComponent(before)}` : "";
  return callChatApi<MessagePage>(`/v1/conversas/${encodeURIComponent(id)}/mensagens${query}`);
}

/** Registra a leitura da conversa até a mensagem e devolve as contagens novas. */
export async function markConversationRead(id: string, messageId: string): Promise<ApiResult<ReadCounts>> {
  return callChatApi<ReadCounts>(`/v1/conversas/${encodeURIComponent(id)}/leitura`, {
    method: "POST",
    body: { mensagem_id: messageId },
  });
}

/** Os participantes da conversa que a pessoa pode mencionar, filtrados por parte do nome ou do @usuário. */
export async function getMentionable(id: string, term: string): Promise<ApiResult<{ pessoas: PersonSummary[] }>> {
  return callChatApi<{ pessoas: PersonSummary[] }>(
    `/v1/conversas/${encodeURIComponent(id)}/mencionaveis?busca=${encodeURIComponent(term)}`,
  );
}
