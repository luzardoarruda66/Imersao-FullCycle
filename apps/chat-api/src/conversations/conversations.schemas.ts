import { z } from 'zod';
import { CHANNEL_NAME_MAX, INVITE_MAX, MESSAGE_TEXT_MAX } from '../config/values.js';

export const createChannelSchema = z.object({
  nome: z.string().trim().min(1).max(CHANNEL_NAME_MAX),
  tipo: z.enum(['publico', 'privado']),
});
export type CreateChannelDto = z.infer<typeof createChannelSchema>;

/**
 * O Postgres aceita o UUID em qualquer caixa, mas a comparação e a chave do par (`directKey`) são de texto:
 * o id entra em minúsculas, a forma que a API devolve.
 */
const memberId = z.uuid().transform((value) => value.toLowerCase());

export const openDirectSchema = z.object({ membro_id: memberId });
export type OpenDirectDto = z.infer<typeof openDirectSchema>;

export const inviteSchema = z.object({ membros_ids: z.array(memberId).min(1).max(INVITE_MAX) });
export type InviteDto = z.infer<typeof inviteSchema>;

/** A âncora do histórico: o id de uma mensagem da própria conversa (a conferência da conversa é do serviço). */
export const listMessagesSchema = z.object({ antes: memberId.optional() });
export type ListMessagesDto = z.infer<typeof listMessagesSchema>;

/** A mensagem até onde a pessoa leu. */
export const readSchema = z.object({ mensagem_id: memberId });
export type ReadDto = z.infer<typeof readSchema>;

/** `citacao_id`: a mensagem que esta cita; a conferência de que é da mesma conversa e não foi apagada é do serviço. */
export const sendMessageSchema = z.object({
  texto: z.string().trim().min(1).max(MESSAGE_TEXT_MAX),
  citacao_id: memberId.optional(),
});
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
