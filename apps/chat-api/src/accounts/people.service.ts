import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '@nestjs/authentication';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { PersonEntity } from '../database/entities/person.entity.js';

export const normalizeEmail = (email: string) => email.trim().normalize('NFC').toLowerCase();

export class EmailAlreadyRegisteredError extends Error {}
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

  async create(input: { email: string; name: string; password: string }) {
    const email = normalizeEmail(input.email);
    const person = this.people.create({
      id: uuidv7(),
      email,
      name: input.name.trim(),
      passwordHash: await this.hasher.hash(input.password),
    });
    // O índice único é quem decide a corrida entre dois cadastros do mesmo e-mail.
    const result = await this.people.insert(person).then(
      () => true,
      (error: { code?: string }) => {
        if (error.code === '23505') return false;
        throw error;
      },
    );
    if (!result) throw new EmailAlreadyRegisteredError(email);
    return person;
  }

  async setPassword(id: string, password: string) {
    await this.people.update({ id }, { passwordHash: await this.hasher.hash(password), updatedAt: new Date() });
  }

  async setFlags(id: string, flags: Partial<Pick<PersonEntity, 'isAdmin' | 'hasDataPermission'>>) {
    await this.people.update({ id }, { ...flags, updatedAt: new Date() });
  }
}
