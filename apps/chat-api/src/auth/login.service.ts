import { Injectable, Logger } from '@nestjs/common';
import { PasswordHasher, SignInService } from '@nestjs/authentication';
import { normalizeEmail, PeopleService } from '../accounts/people.service.js';
import { AppError } from '../errors/app-error.js';
import { LoginAttemptsService } from '../login-attempts/login-attempts.service.js';
import { toMember } from './member.js';

@Injectable()
export class LoginService {
  private readonly logger = new Logger(LoginService.name);

  constructor(
    private readonly people: PeopleService,
    private readonly hasher: PasswordHasher,
    private readonly attempts: LoginAttemptsService,
    private readonly signInService: SignInService,
  ) {}

  async signIn(rawEmail: string, password: string, ip: string) {
    const email = normalizeEmail(rawEmail);

    // A espera vem antes da senha: durante ela, nem a senha certa entra.
    const waiting = await this.attempts.remainingSeconds(email, ip);
    if (waiting > 0) this.refuse(email, ip, waiting);

    const person = await this.people.findByEmail(email);
    // Com e-mail inexistente, o `verify` confere um hash falso: o tempo não revela quem tem conta.
    const valid = await this.hasher.verify(password, person?.passwordHash);
    if (!valid || !person) {
      const blockedFor = await this.attempts.recordFailure(email, ip);
      if (blockedFor > 0) this.refuse(email, ip, blockedFor);
      throw new AppError('credenciais_invalidas', 401, 'E-mail ou senha incorretos');
    }

    await this.attempts.reset(email, ip);
    await this.signInService.signIn(person.id, { method: 'password' });
    return toMember(person);
  }

  private refuse(email: string, ip: string, seconds: number): never {
    this.logger.warn(`Tentativa de entrar bloqueada: email=${email} ip=${ip} segundos_restantes=${seconds}`);
    throw new AppError('tentativas_demais', 429, 'Houve tentativas demais.', { segundos_restantes: seconds });
  }
}
