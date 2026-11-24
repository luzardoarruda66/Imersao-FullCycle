import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '../config/values.js';

const FORMAT = new RegExp(`^[a-z0-9._-]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}$`);

/** Aparar, minúsculas e um `@` inicial opcional. É a forma em que o @usuário é gravado e comparado. */
export function normalizeUsername(input: string): string {
  const trimmed = input.trim().toLowerCase();
  return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
}

/** Formato do @usuário (LLD, seção 9): uma função só, usada pelo comando `contas` e pela busca. Recebe o valor já normalizado. */
export function isValidUsername(value: string): boolean {
  return FORMAT.test(value);
}
