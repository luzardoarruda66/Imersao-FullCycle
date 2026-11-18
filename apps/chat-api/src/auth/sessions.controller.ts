import { Body, Controller, Delete, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Public, SignInService } from '@nestjs/authentication';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { signInSchema, type SignInDto } from './auth.schemas.js';
import { LoginService } from './login.service.js';

@ApiTags('sessoes')
@Controller('sessoes')
export class SessionsController {
  constructor(
    private readonly login: LoginService,
    private readonly signInService: SignInService,
  ) {}

  @ApiOperation({ summary: 'Entrar com e-mail e senha' })
  @Public()
  @UseGuards(ThrottlerGuard)
  @Post()
  signIn(@Body({ schema: signInSchema }) body: SignInDto, @Req() request: Request) {
    return this.login.signIn(body.email, body.senha, request.ip ?? 'desconhecido');
  }

  @ApiOperation({ summary: 'Sair: apaga a sessão do cookie' })
  @Delete('atual')
  @HttpCode(204)
  async signOut() {
    await this.signInService.signOut();
  }
}
