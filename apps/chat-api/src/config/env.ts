import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().min(1),
  // Vazio no ambiente local (LLD, "Segurança": cookie de sessão).
  COOKIE_DOMAIN: z.string().default(''),
  WEB_ORIGIN: z.string().url(),
  // Redis dos eventos por pessoa (LLD, seção 5); o host é o nome do serviço do Compose.
  REDIS_URL: z.string().min(1),
  // Rede de onde o `X-Forwarded-For` é aceito (BFF); aceita o formato do `trust proxy` do Express.
  TRUSTED_PROXY: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/** Valida as variáveis na subida; a mensagem de erro leva o nome de cada uma que faltou. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variáveis de ambiente inválidas ou ausentes: ${names}`);
  }
  return parsed.data;
}
