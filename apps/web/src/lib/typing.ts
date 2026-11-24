/** Tempo para o "digitando" sumir sem novo evento (LLD, "Valores e configuração"). */
export const TYPING_EXPIRE_MS = 5000;
/** No máximo um "digitando" a cada 3 segundos por conversa, no campo de mensagem. */
export const TYPING_SEND_INTERVAL_MS = 3000;

export interface Typer {
  id: string;
  usuario: string;
}

/** Quem digita em cada conversa, com o instante do último evento de cada pessoa. */
export type TypingState = Record<string, Record<string, { typer: Typer; at: number }>>;

export function addTyper(state: TypingState, conversationId: string, typer: Typer, now: number): TypingState {
  return { ...state, [conversationId]: { ...state[conversationId], [typer.id]: { typer, at: now } } };
}

/** Tira o aviso de quem enviou a mensagem; sem mudança, devolve o mesmo estado. */
export function removeTyper(state: TypingState, conversationId: string, personId: string): TypingState {
  const current = state[conversationId];
  if (!current?.[personId]) return state;
  const rest = Object.fromEntries(Object.entries(current).filter(([id]) => id !== personId));
  return { ...state, [conversationId]: rest };
}

/** Descarta quem passou do prazo; sem mudança, devolve o mesmo estado. */
export function pruneTypers(state: TypingState, now: number): TypingState {
  let changed = false;
  const next: TypingState = {};
  for (const [conversationId, typers] of Object.entries(state)) {
    const alive = Object.fromEntries(Object.entries(typers).filter(([, entry]) => now - entry.at < TYPING_EXPIRE_MS));
    if (Object.keys(alive).length !== Object.keys(typers).length) changed = true;
    if (Object.keys(alive).length > 0) next[conversationId] = alive;
  }
  return changed ? next : state;
}

/** O aviso da conversa: "@usuário está digitando" ou "Há N pessoas digitando...". */
export function typingText(state: TypingState, conversationId: string): string | null {
  const typers = Object.values(state[conversationId] ?? {});
  if (typers.length === 0) return null;
  if (typers.length === 1) return `@${typers[0]!.typer.usuario} está digitando`;
  return `Há ${typers.length} pessoas digitando...`;
}
