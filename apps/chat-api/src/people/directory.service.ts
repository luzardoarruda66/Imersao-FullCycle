import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { PersonEntity } from '../database/entities/person.entity.js';
import { AppError } from '../errors/app-error.js';

/** O Perfil de um membro (LLD, seção 5): só o que é visível a todo o workspace, nunca e-mail nem papéis. */
export interface Profile {
  id: string;
  nome: string;
  usuario: string;
  cargo: string | null;
  telefone: string | null;
  status: string | null;
}

const personNotFound = () => new AppError('pessoa_inexistente', 404, 'Esta pessoa não existe.');

@Injectable()
export class DirectoryService {
  constructor(@InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>) {}

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
