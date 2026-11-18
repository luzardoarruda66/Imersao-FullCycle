import { Body, Controller, Get, HttpCode, Put } from '@nestjs/common';
import { CurrentSession, CurrentUser, PasswordHasher, SessionService, type SessionRecord } from '@nestjs/authentication';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { missingPasswordRules } from '../accounts/password-rule.js';
import { PeopleService } from '../accounts/people.service.js';
import { AppError } from '../errors/app-error.js';
import { changePasswordSchema, type ChangePasswordDto } from './auth.schemas.js';
import type { Member } from './member.js';

@ApiTags('eu')
@Controller('eu')
export class MeController {
  constructor(
    private readonly people: PeopleService,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionService,
  ) {}

  @ApiOperation({ summary: 'O membro da sessão' })
  @Get()
  me(@CurrentUser() member: Member) {
    return member;
  }

  @ApiOperation({ summary: 'Trocar a própria senha' })
  @Put('senha')
  @HttpCode(204)
  async changePassword(
    @Body({ schema: changePasswordSchema }) body: ChangePasswordDto,
    @CurrentUser('id') personId: string,
    @CurrentSession() session: SessionRecord,
  ) {
    const person = await this.people.findById(personId);
    if (!person || !(await this.hasher.verify(body.senha_atual, person.passwordHash))) {
      throw new AppError('senha_atual_incorreta', 422, 'Senha atual incorreta.');
    }
    const missing = missingPasswordRules(body.nova_senha);
    if (missing.length > 0) {
      throw new AppError('senha_fraca', 422, 'A nova senha não cumpre a regra.', { regras_faltando: missing });
    }
    await this.people.setPassword(personId, body.nova_senha);
    // A sessão atual continua; as outras sessões da pessoa são apagadas (LLD, 6.2).
    await this.sessions.revokeAll(personId, { except: session.id });
  }
}
