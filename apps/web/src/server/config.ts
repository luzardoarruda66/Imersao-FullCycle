import "server-only";
import { z } from "zod";

const schema = z.object({
  // Endereço da API do chat entre contêineres (`http://chat-api:3001` no Compose).
  CHAT_API_URL: z.url(),
  // Mesmo `Domain` que a API do chat põe no cookie; vazio no ambiente local.
  COOKIE_DOMAIN: z.string().default(""),
});

const parsed = schema.safeParse({
  CHAT_API_URL: process.env.CHAT_API_URL,
  COOKIE_DOMAIN: process.env.COOKIE_DOMAIN,
});
if (!parsed.success) {
  const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
  throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${names}`);
}

export const config = parsed.data;
export const SESSION_COOKIE = "sid";
