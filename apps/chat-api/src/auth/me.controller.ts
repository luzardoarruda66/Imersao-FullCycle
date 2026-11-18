import { Body, Controller, Get, HttpCode, Put } from '@nestjs/common';
import { CurrentSession, CurrentUser, type SessionRecord } from '@nestjs/authentication';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { changePasswordSchema, type ChangePasswordDto } from './auth.schemas.js';
import type { Member } from './member.js';
import { PasswordService } from './password.service.js';

@ApiTags('eu')
@Controller('eu')
export class MeController {
  constructor(private readonly passwords: PasswordService) {}

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
    await this.passwords.change(personId, session.id, body.senha_atual, body.nova_senha);
  }
}
