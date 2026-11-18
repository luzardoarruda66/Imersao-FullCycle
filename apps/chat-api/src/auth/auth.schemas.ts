import { z } from 'zod';

const email = z
  .string()
  .transform((value) => value.trim())
  .pipe(z.email());

export const signInSchema = z.object({ email, senha: z.string().min(1).max(1024) });
export type SignInDto = z.infer<typeof signInSchema>;

export const changePasswordSchema = z.object({
  senha_atual: z.string().min(1).max(1024),
  nova_senha: z.string().min(1).max(1024),
});
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
