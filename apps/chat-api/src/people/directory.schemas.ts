import { z } from 'zod';

/** A busca de pessoas: `busca` ausente ou vazia lista os primeiros membros. O parâmetro repetido (`?busca=a&busca=b`) é recusado. */
export const searchPeopleSchema = z.object({ busca: z.string().default('') });
export type SearchPeopleDto = z.infer<typeof searchPeopleSchema>;
