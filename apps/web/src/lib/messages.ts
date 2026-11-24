import type { ChatMessage } from "chat-events";

/** Junta mensagens sem repetir (pelo id) e em ordem cronológica; o id desempata o mesmo instante (UUID v7 segue o tempo). */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((message) => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort(
    (a, b) => Date.parse(a.criada_em) - Date.parse(b.criada_em) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
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
