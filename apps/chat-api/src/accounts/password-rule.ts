import { randomInt } from 'node:crypto';

export type PasswordRule = 'minimo_8_caracteres' | 'maiuscula' | 'minuscula' | 'numero' | 'simbolo';

const MIN_LENGTH = 8;
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%&*?-_+=';

/** Regra da senha (LLD, seção 9): uma função só, usada pela troca de senha e pela geração do comando. */
export function missingPasswordRules(password: string): PasswordRule[] {
  const missing: PasswordRule[] = [];
  if (password.length < MIN_LENGTH) missing.push('minimo_8_caracteres');
  if (!/\p{Lu}/u.test(password)) missing.push('maiuscula');
  if (!/\p{Ll}/u.test(password)) missing.push('minuscula');
  if (!/\p{N}/u.test(password)) missing.push('numero');
  if (!/[^\p{L}\p{N}]/u.test(password)) missing.push('simbolo');
  return missing;
}

const pick = (alphabet: string) => alphabet[randomInt(alphabet.length)]!;

/** Senha aleatória de 16 caracteres que cumpre a regra. */
export function generatePassword(): string {
  const all = UPPER + LOWER + DIGITS + SYMBOLS;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SYMBOLS)];
  while (chars.length < 16) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}
