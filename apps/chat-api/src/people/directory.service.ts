import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { PersonEntity } from '../database/entities/person.entity.js';
import { normalizeUsername } from '../accounts/username-rule.js';
import { PEOPLE_SEARCH_LIMIT } from '../config/values.js';
import { AppError } from '../errors/app-error.js';
import { escapeLike } from './like.js';

/** O Perfil de um membro (LLD, seção 5): só o que é visível a todo o workspace, nunca e-mail nem papéis. */
export interface Profile {
  id: string;
  nome: string;
  usuario: string;
  cargo: string | null;
  telefone: string | null;
  status: string | null;
}

/** Um item da busca de pessoas: o suficiente para escolher e para distinguir `joao.silva` de `joao_silva`. */
export interface PersonSummary {
  id: string;
  nome: string;
  usuario: string;
}

/** O nome sem acento e em minúsculas: a base da busca e da ordem (LLD, "Dados"; extensão `unaccent`). */
const PLAIN_NAME = 'unaccent(lower(p.name))';

const personNotFound = () => new AppError('pessoa_inexistente', 404, 'Esta pessoa não existe.');

@Injectable()
export class DirectoryService {
  constructor(@InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>) {}

  /**
   * A busca de pessoas: o termo casa com parte do nome ou do @usuário, sem diferenciar maiúsculas e acentos, e um `@`
   * inicial é ignorado. Não devolve quem busca; ordena por nome e devolve no máximo `PEOPLE_SEARCH_LIMIT`. Com o termo
   * vazio, devolve os primeiros membros nessa ordem.
   */
  async search(personId: string, term: string): Promise<PersonSummary[]> {
    const normalized = normalizeUsername(term);
    const query = this.people
      .createQueryBuilder('p')
      .select(['p.id', 'p.name', 'p.username'])
      .where('p.id <> :personId', { personId })
      .orderBy(PLAIN_NAME, 'ASC')
      .addOrderBy('p.id', 'ASC')
      .limit(PEOPLE_SEARCH_LIMIT);
    if (normalized) {
      const like = `'%' || unaccent(lower(:term)) || '%' ESCAPE '\\'`;
      query.andWhere(`(${PLAIN_NAME} LIKE ${like} OR p.username LIKE ${like})`, { term: escapeLike(normalized) });
    }
    const rows = await query.getMany();
    return rows.map((row) => ({ id: row.id, nome: row.name, usuario: row.username }));
  }

  /** O Perfil de qualquer membro. Id que não é um UUID responde como o que não existe: a tela mostra a mesma coisa. */
  async profile(id: string): Promise<Profile> {
    const parsed = z.uuid().safeParse(id);
    if (!parsed.success) throw personNotFound();
    const person = await this.people.findOne({
      where: { id: parsed.data.toLowerCase() },
      select: { id: true, name: true, username: true, jobTitle: true, phone: true, statusText: true },
    });
    if (!person) throw personNotFound();
    return {
      id: person.id,
      nome: person.name,
      usuario: person.username,
      cargo: person.jobTitle,
      telefone: person.phone,
      status: person.statusText,
    };
  }
}
