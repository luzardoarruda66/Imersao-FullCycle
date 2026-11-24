import { z } from 'zod';

/** Nomes das mensagens do servidor para o cliente (LLD, seção 2, "Eventos por pessoa (Redis)"). */
export const SERVER_MESSAGES = { event: 'evento', ready: 'pronto', lost: 'perdido' } as const;

/** Dados de cada tipo de evento de domínio. Os tipos novos entram com as funcionalidades que os emitem. */
export const eventDataSchemas = {
  diagnostico: z.object({ mensagem: z.string() }),
} as const;

export type EventType = keyof typeof eventDataSchemas;

const envelopeBase = { id: z.string().min(1), momento: z.string().min(1) };

/** Evento de domínio com o envelope comum: identificador, tipo, dados e momento. */
export const chatEventSchema = z.discriminatedUnion('tipo', [
  z.object({ ...envelopeBase, tipo: z.literal('diagnostico'), dados: eventDataSchemas.diagnostico }),
]);
export type ChatEvent = z.infer<typeof chatEventSchema>;

/** O evento que quem publica entrega: sem identificador nem momento, que o servidor atribui. */
export const chatEventDraftSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('diagnostico'), dados: eventDataSchemas.diagnostico }),
]);
export type ChatEventDraft = z.infer<typeof chatEventDraftSchema>;

/** `pronto`: ponto de partida da reposição (identificador atual da pessoa; nulo se ainda não há evento). */
export const readyMessageSchema = z.object({ ultimo_evento: z.string().nullable() });
export type ReadyMessage = z.infer<typeof readyMessageSchema>;

/** `perdido`: não há como repor; o cliente recarrega pelo histórico. */
export const lostMessageSchema = z.object({});
export type LostMessage = z.infer<typeof lostMessageSchema>;

/** O que o cliente manda no `auth` do handshake: o último evento confirmado. */
export const handshakeAuthSchema = z.object({ ultimo_evento: z.string().optional() });
export type HandshakeAuth = z.infer<typeof handshakeAuthSchema>;

/** Ordena dois identificadores de evento da mesma época (`época-instante-sequência`). */
export interface ParsedEventId {
  epoch: string;
  time: number;
  seq: number;
}

export function formatEventId(id: ParsedEventId): string {
  return `${id.epoch}-${id.time}-${id.seq}`;
}

export function parseEventId(raw: string): ParsedEventId | null {
  const match = /^([A-Za-z0-9_]+)-(\d+)-(\d+)$/.exec(raw);
  if (!match) return null;
  return { epoch: match[1]!, time: Number(match[2]), seq: Number(match[3]) };
}

export function compareEventIds(a: ParsedEventId, b: ParsedEventId): number {
  return a.time - b.time || a.seq - b.seq;
}
