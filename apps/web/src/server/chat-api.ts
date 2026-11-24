import "server-only";
import { cookies, headers } from "next/headers";
import { interpretResponse, type ApiResult } from "@/lib/chat-api-response";
import { parseSetCookie } from "@/lib/set-cookie";
import { SESSION_COOKIE } from "@/lib/session-cookie";
import { config } from "./config";

interface CallOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
}

/** IP do navegador, repassado à API do chat em `X-Forwarded-For` (LLD, seção 5). */
async function browserIp(): Promise<string | undefined> {
  const incoming = await headers();
  return incoming.get("x-forwarded-for")?.split(",")[0]?.trim() || incoming.get("x-real-ip") || undefined;
}

/**
 * Camada de acesso à API do chat: repassa o cookie `sid` no cabeçalho `Cookie`, manda o IP do navegador e
 * traduz a resposta. O `Set-Cookie` da API (ao entrar e ao sair) vai ao navegador por `forwardSetCookies`.
 */
export async function callChatApi<T = unknown>(
  path: string,
  { method = "GET", body }: CallOptions = {},
): Promise<ApiResult<T> & { setCookies?: string[] }> {
  const jar = await cookies();
  const sid = jar.get(SESSION_COOKIE)?.value;
  const ip = await browserIp();
  try {
    const response = await fetch(`${config.CHAT_API_URL}${path}`, {
      method,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(sid ? { Cookie: `${SESSION_COOKIE}=${encodeURIComponent(sid)}` } : {}),
        ...(ip ? { "X-Forwarded-For": ip } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const parsed = await response.json().catch(() => undefined);
    return { ...interpretResponse<T>(response.status, parsed), setCookies: response.headers.getSetCookie() };
  } catch {
    return { kind: "unavailable" };
  }
}

/** Devolve ao navegador o `Set-Cookie` da API. Só roda em Server Action ou Route Handler. */
export async function forwardSetCookies(setCookies: string[] | undefined) {
  const jar = await cookies();
  for (const header of setCookies ?? []) {
    const cookie = parseSetCookie(header);
    if (cookie) jar.set(cookie.name, cookie.value, cookie.options);
  }
}

/** Apaga o cookie `sid` no navegador (sessão inválida). Só roda em Server Action ou Route Handler. */
export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    ...(config.COOKIE_DOMAIN ? { domain: config.COOKIE_DOMAIN } : {}),
  });
}
