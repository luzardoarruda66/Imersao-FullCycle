import type { ChatMessage } from "chat-events";

/** Junta mensagens sem repetir (pelo id) e em ordem cronológica; o id desempata o mesmo instante (UUID v7 segue o tempo). */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.criada_em) - Date.parse(b.criada_em) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}

/** O prazo para editar e apagar a própria mensagem: 4 horas depois do envio (PRD da F1-05). A API é quem recusa; aqui só se esconde a ação. */
export const EDIT_WINDOW_MS = 4 * 60 * 60 * 1000;

/** O membro pode editar a mensagem: é o autor, ela não foi apagada e o prazo de 4 horas (inclusive) não passou. */
export function canEdit(message: ChatMessage, memberId: string | undefined, now: number): boolean {
  if (!memberId || message.autor.id !== memberId || message.apagada) return false;
  return now - Date.parse(message.criada_em) <= EDIT_WINDOW_MS;
}

/**
 * Aplica uma mensagem editada à lista: troca pelo id e atualiza o trecho das citações carregadas a ela. Mensagem que não
 * está carregada, ou que chega mais velha que a já mostrada (eventos fora de ordem) ou depois de apagada, não muda a
 * lista (devolve a mesma). Aplicar duas vezes a mesma edição dá o mesmo resultado.
 */
export function applyEdit(messages: ChatMessage[], edited: ChatMessage): ChatMessage[] {
  const shown = messages.find((message) => message.id === edited.id);
  if (!shown || shown.apagada) return messages;
  if (shown.editada_em && edited.editada_em && Date.parse(edited.editada_em) < Date.parse(shown.editada_em)) return messages;
  return messages.map((message) => {
    if (message.id === edited.id) return edited;
    const quote = message.citacao;
    if (quote?.id === edited.id && !quote.apagada) return { ...message, citacao: { ...quote, trecho: excerptOf(edited.texto) } };
    return message;
  });
}

/** O tamanho do trecho de uma citação, em caracteres (LLD, "Valores e configuração"): é o mesmo da API. */
export const QUOTE_EXCERPT_MAX = 140;

/** O trecho que a citação mostra: até 140 caracteres de verdade (sem partir um emoji), com reticências se cortou. */
export function excerptOf(text: string): string {
  const characters = Array.from(text);
  return characters.length <= QUOTE_EXCERPT_MAX ? text : `${characters.slice(0, QUOTE_EXCERPT_MAX).join("")}…`;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" });
const dateWithYearFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** O rótulo do divisor de dia: Hoje, Ontem ou a data, com o ano só quando não é o atual. Na hora local. */
export function dayLabel(date: Date, now: Date): string {
  const days = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / DAY_MS);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return date.getFullYear() === now.getFullYear() ? dateFormat.format(date) : dateWithYearFormat.format(date);
}

/** Hora e minuto em 24 horas, na hora local. */
export function formatTime(date: Date): string {
  return timeFormat.format(date);
}

export interface DayGroup {
  key: string;
  label: string;
  messages: ChatMessage[];
}

/** Agrupa mensagens seguidas do mesmo dia local, na ordem recebida. */
export function groupByDay(messages: ChatMessage[], now: Date): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const message of messages) {
    const date = new Date(message.criada_em);
    const key = startOfDay(date).toISOString();
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.messages.push(message);
    else groups.push({ key, label: dayLabel(date, now), messages: [message] });
  }
  return groups;
}
