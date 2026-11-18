import "server-only";
import { cookies } from "next/headers";
import { callChatApi } from "./chat-api";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export interface Member {
  id: string;
  email: string;
  nome: string;
  administrador: boolean;
  permissao_dados: boolean;
}

export type SessionState =
  | { kind: "member"; member: Member }
  | { kind: "none" } // sem cookie, ou a API disse que a sessão não vale
  | { kind: "unavailable" }; // API fora do ar: ninguém sai da sessão por isso

/** O membro da sessão, conferido na API do chat (o proxy só olha se o cookie existe). */
export async function getSessionState(): Promise<SessionState> {
  const jar = await cookies();
  if (!jar.get(SESSION_COOKIE)) return { kind: "none" };
  const result = await callChatApi<Member>("/v1/eu");
  if (result.kind === "ok") return { kind: "member", member: result.data };
  // Só o 401 (`sessao_invalida`) derruba a sessão; qualquer outra falha é da API, e uma queda não tira ninguém da sessão.
  if (result.kind === "invalid-session") return { kind: "none" };
  return { kind: "unavailable" };
}
