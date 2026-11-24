import "server-only";
import type { ApiResult } from "@/lib/chat-api-response";
import type { PersonProfile } from "@/lib/people";
import { callChatApi } from "./chat-api";

/** O Perfil de qualquer membro. Id que não existe ou que não é um UUID volta como erro de negócio (`pessoa_inexistente`). */
export async function getPerson(id: string): Promise<ApiResult<PersonProfile>> {
  return callChatApi<PersonProfile>(`/v1/pessoas/${encodeURIComponent(id)}`);
}
