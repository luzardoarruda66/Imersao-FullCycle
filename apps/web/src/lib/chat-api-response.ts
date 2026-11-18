/** Resultado de uma chamada à API do chat, já traduzido para o que o BFF faz com ele (LLD, seção 8, "Sessão no cliente"). */
export type ApiResult<T = unknown> =
  | { kind: "ok"; status: number; data: T }
  | { kind: "invalid-session" }
  | { kind: "unavailable" }
  | { kind: "error"; status: number; code: string; message: string; details?: Record<string, unknown> };

interface ErrorBody {
  error?: { code?: unknown; message?: unknown; details?: unknown };
}

export function interpretResponse<T = unknown>(status: number, body: unknown): ApiResult<T> {
  if (status >= 200 && status < 300) return { kind: "ok", status, data: body as T };
  if (status >= 500) return { kind: "unavailable" };

  const error = (body as ErrorBody | null)?.error;
  const code = typeof error?.code === "string" ? error.code : undefined;
  if (status === 401 && (code === undefined || code === "sessao_invalida")) return { kind: "invalid-session" };

  return {
    kind: "error",
    status,
    code: code ?? "desconhecido",
    message: typeof error?.message === "string" ? error.message : "",
    details: error?.details && typeof error.details === "object" ? (error.details as Record<string, unknown>) : undefined,
  };
}
