import type { ChatMessage } from "chat-events";

/**
 * Os caracteres de um @usuário (LLD, "Valores e configuração", "Formato do @usuário"). Quem decide o que é menção é a API
 * (`mention-parser`, na `chat-api`); aqui só se acha de novo, no texto, o que ela já devolveu em `mencoes`.
 */
const USERNAME_CHARS = "a-z0-9._-";
/** O `@` aberto logo antes do cursor: no começo do texto ou depois de algo que não é parte de um @usuário. */
const OPEN_MENTION = new RegExp(`(?<![@${USERNAME_CHARS}])@([${USERNAME_CHARS}]*)$`, "i");

export interface OpenMention {
  /** Onde o `@` está no texto. */
  start: number;
  /** Onde o cursor está: o fim do que já foi digitado do @usuário. */
  end: number;
  /** O que já foi digitado depois do `@`, em minúsculas. */
  term: string;
}

/** A menção que a pessoa está digitando antes do cursor, ou `null`. É o que abre a lista de participantes. */
export function activeMention(text: string, caret: number): OpenMention | null {
  const match = OPEN_MENTION.exec(text.slice(0, caret));
  if (!match) return null;
  return { start: match.index, end: caret, term: match[1]!.toLowerCase() };
}

/** Troca o `@` digitado pelo @usuário escolhido, com um espaço depois, e dá a nova posição do cursor. */
export function insertMention(text: string, open: Pick<OpenMention, "start" | "end">, username: string) {
  const inserted = `@${username} `;
  return { text: text.slice(0, open.start) + inserted + text.slice(open.end), caret: open.start + inserted.length };
}

/** Uma pessoa mencionada, no formato da mensagem do `chat-events`. */
export type MentionRef = ChatMessage["mencoes"][number];

export type TextSegment = { text: string; mention?: MentionRef };

/**
 * Parte o texto de uma mensagem em trechos, destacando só os `@usuário` que vieram em `mencoes`: o `@` que a API não
 * reconheceu como menção fica como texto comum, e `ana@empresa.com` nunca é menção.
 */
export function splitMentions(text: string, mencoes: MentionRef[]): TextSegment[] {
  if (text === "") return [];
  if (mencoes.length === 0) return [{ text }];
  const byUsername = new Map(mencoes.map((mention) => [mention.usuario, mention]));
  const pattern = new RegExp(`(?<![@${USERNAME_CHARS}])@([${USERNAME_CHARS}]+)`, "gi");
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const mention = pickMention(match[1]!.toLowerCase(), byUsername);
    if (!mention) continue;
    const start = match.index;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ mention: mention.ref, text: text.slice(start, start + 1 + mention.length) });
    cursor = start + 1 + mention.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/** O @usuário que o trecho cita: ele inteiro ou, se terminar em pontuação ("@bia."), sem ela. */
function pickMention(raw: string, byUsername: Map<string, MentionRef>): { ref: MentionRef; length: number } | null {
  let current = raw;
  for (;;) {
    const ref = byUsername.get(current);
    if (ref) return { ref, length: current.length };
    if (!/[._-]$/.test(current)) return null;
    current = current.slice(0, -1);
  }
}
