import type { PersonEntity } from '../database/entities/person.entity.js';

/** O que a API devolve de um membro: nunca o registro inteiro (sem o hash da senha). */
export interface Member {
  id: string;
  email: string;
  nome: string;
  administrador: boolean;
  permissao_dados: boolean;
}

export const toMember = (person: PersonEntity): Member => ({
  id: person.id,
  email: person.email,
  nome: person.name,
  administrador: person.isAdmin,
  permissao_dados: person.hasDataPermission,
});
