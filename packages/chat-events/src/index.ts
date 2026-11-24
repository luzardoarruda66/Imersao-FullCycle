import { z } from 'zod';

/** Nomes das mensagens do servidor para o cliente (LLD, seção 2, "Eventos por pessoa (Redis)"). */
export const SERVER_MESSAGES = { event: 'evento', ready: 'pronto', lost: 'perdido' } as const;

/** Nomes das mensagens do cliente para o servidor (F1-04). */
export const CLIENT_MESSAGES = { typing: 'digitando' } as const;

/** As contagens da pessoa numa conversa: nunca negativas. */
export const readCountsSchema = z.object({
  nao_lidas: z.number().int().min(0),
  mencoes: z.number().int().min(0),
});
export type ReadCounts = z.infer<typeof readCountsSchema>;

/** A mensagem do cliente `digitando`: a conversa em que a pessoa digita. */
export const typingMessageSchema = z.object({ conversa_id: z.string().min(1) });
export type TypingMessage = z.infer<typeof typingMessageSchema>;

const memberRefSchema = z.object({ id: z.string().min(1), nome: z.string(), usuario: z.string().min(1) });

/** A mensagem que outra cita: o autor e um trecho do texto atual; apagada, sem texto (F1-05). */
export const quoteSchema = z.object({
  id: z.string().min(1),
  autor: memberRefSchema,
  trecho: z.string(),
  apagada: z.boolean(),
});
export type Quote = z.infer<typeof quoteSchema>;

/**
 * Uma mensagem de conversa como a API do chat a devolve e os eventos de mensagem a carregam: um schema só, no envio,
 * no histórico e nos eventos. Os campos da F1-05 assumem o valor vazio quando faltam, para repor sem erro um evento
 * guardado antes dela.
 */
export const chatMessageSchema = z.object({
  id: z.string().min(1),
  conversa_id: z.string().min(1),
  autor: memberRefSchema,
  texto: z.string(),
  criada_em: z.string().min(1),
  /** As pessoas mencionadas, para o cliente destacar só as menções reais. */
  mencoes: z.array(memberRefSchema.pick({ id: true, usuario: true })).default([]),
  citacao: quoteSchema.nullable().default(null),
  editada_em: z.string().min(1).nullable().default(null),
  apagada: z.boolean().default(false),
});
export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Dados de cada tipo de evento de domínio. Os tipos novos entram com as funcionalidades que os emitem. */
export const eventDataSchemas = {
  diagnostico: z.object({ mensagem: z.string() }),
  /** Uma mensagem nova numa conversa que a pessoa vê. */
  mensagem_criada: z.object({
    conversa_id: z.string().min(1),
    mensagem: chatMessageSchema,
    /** As contagens da pessoa que recebe o evento, já com a soma desta mensagem. */
    contagens: readCountsSchema,
  }),
  /** A pessoa leu a conversa (em outra aba): as contagens novas dela. */
  contagem_atualizada: z.object({ conversa_id: z.string().min(1) }).extend(readCountsSchema.shape),
  /** Alguém digita na conversa. Só ao vivo: não entra na reposição depois de uma queda. */
  digitando: z.object({ conversa_id: z.string().min(1), pessoa: z.object({ id: z.string().min(1), usuario: z.string().min(1) }) }),
  /** A pessoa passou a ver uma conversa (canal novo, conversa direta aberta ou convite recebido): a lista muda. */
  conversa_visivel: z.object({ conversa_id: z.string().min(1) }),
} as const;

export type EventType = keyof typeof eventDataSchemas;

/** Eventos que só saem ao vivo: não são guardados para a reposição depois de uma queda. */
export function isLiveOnly(type: EventType): boolean {
  return type === 'digitando';
}

const envelopeBase = { id: z.string().min(1), momento: z.string().min(1) };

/** Evento de domínio com o envelope comum: identificador, tipo, dados e momento. */
export const chatEventSchema = z.discriminatedUnion('tipo', [
  z.object({ ...envelopeBase, tipo: z.literal('diagnostico'), dados: eventDataSchemas.diagnostico }),
  z.object({ ...envelopeBase, tipo: z.literal('mensagem_criada'), dados: eventDataSchemas.mensagem_criada }),
  z.object({ ...envelopeBase, tipo: z.literal('conversa_visivel'), dados: eventDataSchemas.conversa_visivel }),
  z.object({ ...envelopeBase, tipo: z.literal('contagem_atualizada'), dados: eventDataSchemas.contagem_atualizada }),
  z.object({ ...envelopeBase, tipo: z.literal('digitando'), dados: eventDataSchemas.digitando }),
]);
export type ChatEvent = z.infer<typeof chatEventSchema>;

/** O evento que quem publica entrega: sem identificador nem momento, que o servidor atribui. */
export const chatEventDraftSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('diagnostico'), dados: eventDataSchemas.diagnostico }),
  z.object({ tipo: z.literal('mensagem_criada'), dados: eventDataSchemas.mensagem_criada }),
  z.object({ tipo: z.literal('conversa_visivel'), dados: eventDataSchemas.conversa_visivel }),
  z.object({ tipo: z.literal('contagem_atualizada'), dados: eventDataSchemas.contagem_atualizada }),
  z.object({ tipo: z.literal('digitando'), dados: eventDataSchemas.digitando }),
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

/** Se o evento `id` vem depois de `reference` na ordem da pessoa; outra época ou identificador ilegível vale como novo. */
export function isNewerEventId(id: string, reference: string): boolean {
  const a = parseEventId(id);
  const b = parseEventId(reference);
  if (!a || !b || a.epoch !== b.epoch) return true;
  return compareEventIds(a, b) > 0;
}
