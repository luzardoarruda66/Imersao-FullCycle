import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '../config/values.js';

const FORMAT = new RegExp(`^[a-z0-9._-]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`);

/** Aparar, minúsculas e um `@` inicial opcional. É a forma em que o @usuário é gravado e comparado. */
export function normalizeUsername(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

/** Formato do @usuário (LLD, seção 9): uma função só, usada pelo comando `contas`. Recebe o valor já normalizado. */
export function isValidUsername(value: string): boolean {
  return FORMAT.test(value);
}

export const USERNAME_FORMAT_MESSAGE = `@usuário fora do formato: use de ${USERNAME_MIN_LENGTH} a ${USERNAME_MAX_LENGTH} caracteres entre letras minúsculas sem acento, números, ".", "-" e "_".`;

/** O @usuário normalizado, ou a mensagem do que está errado. */
export function parseUsername(input: string): { username: string } | { error: string } {
  const username = normalizeUsername(input);
  return isValidUsername(username) ? { username } : { error: USERNAME_FORMAT_MESSAGE };
}
