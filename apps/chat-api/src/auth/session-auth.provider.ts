import { Injectable } from '@nestjs/common';
import { AuthenticationRegistry, SessionCookieProvider, type SessionRecord } from '@nestjs/authentication';
import { PeopleService } from '../accounts/people.service.js';
import { toMember, type Member } from './member.js';

@Injectable()
export class SessionAuth extends SessionCookieProvider<Member> {
  constructor(
    private readonly people: PeopleService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  // Roda a cada requisição com cookie vivo; sem a pessoa, a sessão deixa de valer.
  async validate(session: SessionRecord) {
    const person = await this.people.findById(session.userId);
    return person ? toMember(person) : null;
  }
}
