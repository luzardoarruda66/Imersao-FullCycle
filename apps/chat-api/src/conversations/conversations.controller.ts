import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Member } from '../auth/member.js';
import {
  createChannelSchema,
  inviteSchema,
  openDirectSchema,
  sendMessageSchema,
  type CreateChannelDto,
  type InviteDto,
  type OpenDirectDto,
  type SendMessageDto,
} from './conversations.schemas.js';
import { ConversationsService } from './conversations.service.js';
import { MessagesService } from './messages.service.js';

@ApiTags('conversas')
@Controller('conversas')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
  ) {}

  @ApiOperation({ summary: 'As conversas do membro, separadas por tipo' })
  @Get()
  list(@CurrentUser('id') personId: string) {
    return this.conversations.list(personId);
  }

  @ApiOperation({ summary: 'Criar um canal público ou privado' })
  @Post('canais')
  createChannel(@Body({ schema: createChannelSchema }) body: CreateChannelDto, @CurrentUser('id') personId: string) {
    return this.conversations.createChannel(personId, body);
  }

  @ApiOperation({ summary: 'Abrir a conversa direta com um membro, ou devolver a que já existe' })
  @Post('diretas')
  @HttpCode(200)
  openDirect(@Body({ schema: openDirectSchema }) body: OpenDirectDto, @CurrentUser('id') personId: string) {
    return this.conversations.openDirect(personId, body.membro_id);
  }

  @ApiOperation({ summary: 'Uma conversa; o canal privado traz os participantes' })
  @Get(':id')
  get(@Param('id') id: string, @CurrentUser('id') personId: string) {
    return this.conversations.get(id, personId);
  }

  @ApiOperation({ summary: 'Convidar membros para um canal privado' })
  @Post(':id/participantes')
  @HttpCode(200)
  invite(@Param('id') id: string, @Body({ schema: inviteSchema }) body: InviteDto, @CurrentUser('id') personId: string) {
    return this.conversations.invite(id, personId, body.membros_ids);
  }

  @ApiOperation({ summary: 'As 50 mensagens mais recentes, da mais antiga para a mais nova' })
  @Get(':id/mensagens')
  listMessages(@Param('id') id: string, @CurrentUser('id') personId: string) {
    return this.messages.recent(id, personId);
  }

  @ApiOperation({ summary: 'Enviar uma mensagem' })
  @Post(':id/mensagens')
  sendMessage(
    @Param('id') id: string,
    @Body({ schema: sendMessageSchema }) body: SendMessageDto,
    @CurrentUser() member: Member,
  ) {
    return this.messages.send(id, { id: member.id, nome: member.nome }, body.texto);
  }
}
