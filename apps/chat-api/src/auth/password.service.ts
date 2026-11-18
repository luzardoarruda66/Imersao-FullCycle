import { Injectable } from '@nestjs/common';
import { PasswordHasher, SessionService } from '@nestjs/authentication';
import { missingPasswordRules } from '../accounts/password-rule.js';
import { PeopleService } from '../accounts/people.service.js';
import { AppError } from '../errors/app-error.js';

@Injectable()
export class PasswordService {
  constructor(
    private readonly people: PeopleService,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  /** Trocar a senha (LLD, 6.2): com a atual errada nada muda; a sessão atual continua e as outras são apagadas. */
  async change(personId: string, currentSessionId: string, currentPassword: string, newPassword: string) {
    const person = await this.people.findById(personId);
    if (!person || !(await this.hasher.verify(currentPassword, person.passwordHash))) {
      throw new AppError('senha_atual_incorreta', 422, 'Senha atual incorreta.');
    }
    const missing = missingPasswordRules(newPassword);
    if (missing.length > 0) {
      throw new AppError('senha_fraca', 422, 'A nova senha não cumpre a regra.', { regras_faltando: missing });
    }
    await this.people.setPassword(personId, newPassword);
    await this.sessions.revokeAll(personId, { except: currentSessionId });
  }
}
