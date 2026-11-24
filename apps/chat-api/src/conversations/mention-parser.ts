import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from '../config/values.js';

const USERNAME_CHARS = 'a-z0-9._-';
/** `@` no começo do texto ou depois de algo que não é parte de um @usuário (espaço, pontuação): `ana@empresa.com` não é menção. */
const MENTION = new RegExp(`(?<![@${USERNAME_CHARS}])@([${USERNAME_CHARS}]+)`, 'gi');
const TRAILING_PUNCTUATION = /[._-]$/;

/** O @usuário que um trecho depois do `@` pode ser: ele inteiro e, se terminar em pontuação, sem ela ("@bia." também é "@bia"). */
function variantsOf(raw: string): string[] {
  const variants: string[] = [];
  let current = raw.toLowerCase();
  for (;;) {
    if (current.length >= USERNAME_MIN_LENGTH && current.length <= USERNAME_MAX_LENGTH) variants.push(current);
    if (!TRAILING_PUNCTUATION.test(current)) return variants;
    current = current.slice(0, -1);
  }
}

/** Cada trecho `@...` do texto, com as formas que ele pode ter, na ordem em que aparece. */
function mentionsIn(text: string): string[][] {
  return [...text.matchAll(MENTION)].map((match) => variantsOf(match[1]!));
}

/** Todos os @usuários que o texto pode estar citando, sem repetir: é o que se procura entre os participantes. */
export function mentionCandidates(text: string): string[] {
  return [...new Set(mentionsIn(text).flat())];
}

/**
 * Os @usuários do texto que existem em `known`, na ordem em que aparecem e sem repetir. Uma função só decide o que é
 * menção, no envio e na edição (LLD, "Concorrência e idempotência"). Para cada trecho vale a forma mais longa que existe.
 */
export function resolveMentions(text: string, known: ReadonlySet<string>): string[] {
  const found: string[] = [];
  for (const variants of mentionsIn(text)) {
    const username = variants.find((variant) => known.has(variant));
    if (username !== undefined && !found.includes(username)) found.push(username);
  }
  return found;
}
