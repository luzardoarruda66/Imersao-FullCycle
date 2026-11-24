import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { PersonEntity } from '../database/entities/person.entity.js';
import { normalizeUsername } from './username-rule.js';

export const normalizeEmail = (email: string) => email.trim().normalize('NFC').toLowerCase();

export class EmailAlreadyRegisteredError extends Error {}
export class UsernameAlreadyTakenError extends Error {}
export class PersonNotFoundError extends Error {}

@Injectable()
export class PeopleService {
  constructor(
    @InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>,
    private readonly hasher: PasswordHasher,
  ) {}

  findByEmail(email: string) {
    return this.people.findOneBy({ email: normalizeEmail(email) });
  }

  findById(id: string) {
    return this.people.findOneBy({ id });
  }

  async create(input: { email: string; username: string; name: string; password: string }) {
    const email = normalizeEmail(input.email);
    const person = this.people.create({
      id: uuidv7(),
      email,
      username: normalizeUsername(input.username),
      name: input.name.trim(),
      passwordHash: await this.hasher.hash(input.password),
    });
    // O índice único é quem decide a corrida entre dois cadastros do mesmo e-mail ou do mesmo @usuário.
    await this.people.insert(person).catch((error: { code?: string; constraint?: string }) => {
      if (error.code === '23505') {
        if (error.constraint === 'UQ_people_username') throw new UsernameAlreadyTakenError(person.username);
        throw new EmailAlreadyRegisteredError(email);
      }
      throw error;
    });
    return person;
  }

  async setPassword(id: string, password: string) {
    await this.people.update({ id }, { passwordHash: await this.hasher.hash(password), updatedAt: new Date() });
  }

  /** Troca o @usuário da conta; o índice único decide a corrida com outro cadastro ou outra troca. */
  async setUsername(id: string, username: string) {
    const normalized = normalizeUsername(username);
    await this.people
      .update({ id }, { username: normalized, updatedAt: new Date() })
      .catch((error: { code?: string; constraint?: string }) => {
        if (error.code === '23505' && error.constraint === 'UQ_people_username') throw new UsernameAlreadyTakenError(normalized);
        throw error;
      });
  }

  async setFlags(id: string, flags: Partial<Pick<PersonEntity, 'isAdmin' | 'hasDataPermission'>>) {
    await this.people.update({ id }, { ...flags, updatedAt: new Date() });
  }
}
