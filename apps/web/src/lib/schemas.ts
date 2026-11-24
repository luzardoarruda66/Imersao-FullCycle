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

/** Limites das conversas (LLD, seção 9, "Valores e configuração"). */
export const CHANNEL_NAME_MAX = 80;
export const MESSAGE_TEXT_MAX = 4000;

export const createChannelSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(1, `Informe um nome de 1 a ${CHANNEL_NAME_MAX} caracteres.`)
    .max(CHANNEL_NAME_MAX, `O nome pode ter no máximo ${CHANNEL_NAME_MAX} caracteres.`),
  // Sem tipo escolhido de antemão: quem não escolhe vê o erro, e nenhum canal sai público por engano.
  tipo: z.enum(["publico", "privado"], { error: "Escolha se o canal é público ou privado." }),
});

export const sendMessageSchema = z.object({
  texto: z
    .string()
    .trim()
    .min(1, "Escreva uma mensagem.")
    .max(MESSAGE_TEXT_MAX, "A mensagem passa de 4.000 caracteres. Divida o texto em mais de uma mensagem."),
});

export const inviteSchema = z.object({
  membrosIds: z.array(z.uuid()).min(1, "Escolha pelo menos uma pessoa."),
});

export const openDirectSchema = z.object({ membroId: z.uuid() });

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
