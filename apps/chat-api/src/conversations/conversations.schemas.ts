import { z } from 'zod';
import { CHANNEL_NAME_MAX, INVITE_MAX, MESSAGE_TEXT_MAX } from '../config/values.js';

export const createChannelSchema = z.object({
  nome: z.string().trim().min(1).max(CHANNEL_NAME_MAX),
  tipo: z.enum(['publico', 'privado']),
});
export type CreateChannelDto = z.infer<typeof createChannelSchema>;

export const openDirectSchema = z.object({ membro_id: z.uuid() });
export type OpenDirectDto = z.infer<typeof openDirectSchema>;

export const inviteSchema = z.object({ membros_ids: z.array(z.uuid()).min(1).max(INVITE_MAX) });
export type InviteDto = z.infer<typeof inviteSchema>;

export const sendMessageSchema = z.object({ texto: z.string().trim().min(1).max(MESSAGE_TEXT_MAX) });
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
