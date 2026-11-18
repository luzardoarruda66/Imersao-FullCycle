import { z } from "zod";

const EMAIL_MESSAGE = "Informe um e-mail válido, como nome@empresa.com.";

/** Entrada das Server Actions, validada antes de chamar a API do chat (ADR 0024). */
export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, EMAIL_MESSAGE)
    .pipe(z.email(EMAIL_MESSAGE)),
  senha: z.string().min(1, "Informe sua senha."),
});

export const changePasswordSchema = z
  .object({
    senhaAtual: z.string().min(1, "Informe a senha atual."),
    novaSenha: z.string().min(1, "Informe a nova senha."),
    confirmacao: z.string().min(1, "Confirme a nova senha."),
  })
  .refine((value) => !value.novaSenha || !value.confirmacao || value.novaSenha === value.confirmacao, {
    path: ["confirmacao"],
    message: "As senhas não são iguais.",
  });

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Primeiro erro de cada campo, para mostrar na tela. */
export function fieldErrorsOf<K extends string>(error: z.ZodError): FieldErrors<K> {
  const result: FieldErrors<K> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]) as K;
    result[key] ??= issue.message;
  }
  return result;
}
