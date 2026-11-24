import "server-only";
import type { ApiResult } from "@/lib/chat-api-response";
import type { PersonProfile, PersonSummary } from "@/lib/people";
import { callChatApi } from "./chat-api";

/** A busca de pessoas por parte do nome ou do @usuário; o termo vazio lista os primeiros membros. */
export async function searchPeople(term: string): Promise<ApiResult<{ pessoas: PersonSummary[] }>> {
  return callChatApi<{ pessoas: PersonSummary[] }>(`/v1/pessoas?busca=${encodeURIComponent(term)}`);
}

/** O Perfil de qualquer membro. Id que não existe ou que não é um UUID volta como erro de negócio (`pessoa_inexistente`). */
export async function getPerson(id: string): Promise<ApiResult<PersonProfile>> {
  return callChatApi<PersonProfile>(`/v1/pessoas/${encodeURIComponent(id)}`);
}
