import { Body, Controller, Delete, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { Public, SignInService } from '@nestjs/authentication';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { LOGIN_IP_CEILING, LOGIN_IP_CEILING_WINDOW_MS } from '../config/values.js';
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
  // Teto por IP contra quem testa muitos e-mails de um IP só (LLD, "Segurança").
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: LOGIN_IP_CEILING, ttl: LOGIN_IP_CEILING_WINDOW_MS } })
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
