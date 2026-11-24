import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Member } from '../auth/member.js';
import {
  createChannelSchema,
  editMessageSchema,
  inviteSchema,
  listMessagesSchema,
  openDirectSchema,
  readSchema,
  sendMessageSchema,
  type CreateChannelDto,
  type EditMessageDto,
  type InviteDto,
  type ListMessagesDto,
  type OpenDirectDto,
  type ReadDto,
  type SendMessageDto,
} from './conversations.schemas.js';
import { searchPeopleSchema, type SearchPeopleDto } from '../people/directory.schemas.js';
import { ConversationsService } from './conversations.service.js';
import { MentionsService } from './mentions.service.js';
import { MessagesService } from './messages.service.js';

@ApiTags('conversas')
@Controller('conversas')
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly messages: MessagesService,
    private readonly mentions: MentionsService,
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

  @ApiOperation({ summary: 'Uma página de 50 mensagens, da mais antiga para a mais nova; `antes` pagina para trás' })
  @Get(':id/mensagens')
  listMessages(
    @Param('id') id: string,
    @Query({ schema: listMessagesSchema }) query: ListMessagesDto,
    @CurrentUser('id') personId: string,
  ) {
    return this.messages.page(id, personId, query.antes);
  }

  @ApiOperation({ summary: 'Os participantes da conversa que a pessoa pode mencionar, filtrados por nome ou @usuário' })
  @Get(':id/mencionaveis')
  async mentionable(
    @Param('id') id: string,
    @Query({ schema: searchPeopleSchema }) query: SearchPeopleDto,
    @CurrentUser('id') personId: string,
  ) {
    return { pessoas: await this.mentions.mentionable(id, personId, query.busca) };
  }

  @ApiOperation({ summary: 'Registrar a leitura da conversa até uma mensagem; devolve as contagens' })
  @Post(':id/leitura')
  @HttpCode(200)
  markRead(@Param('id') id: string, @Body({ schema: readSchema }) body: ReadDto, @CurrentUser('id') personId: string) {
    return this.messages.markRead(id, personId, body.mensagem_id);
  }

  @ApiOperation({ summary: 'Editar o texto da própria mensagem, até 4 horas depois do envio' })
  @Patch(':id/mensagens/:mensagemId')
  editMessage(
    @Param('id') id: string,
    @Param('mensagemId') messageId: string,
    @Body({ schema: editMessageSchema }) body: EditMessageDto,
    @CurrentUser('id') personId: string,
  ) {
    return this.messages.edit(id, personId, messageId, body.texto);
  }

  @ApiOperation({ summary: 'Apagar a própria mensagem, até 4 horas depois do envio; apagar de novo não faz nada' })
  @Delete(':id/mensagens/:mensagemId')
  @HttpCode(200)
  deleteMessage(@Param('id') id: string, @Param('mensagemId') messageId: string, @CurrentUser('id') personId: string) {
    return this.messages.remove(id, personId, messageId);
  }

  @ApiOperation({ summary: 'Enviar uma mensagem' })
  @Post(':id/mensagens')
  sendMessage(
    @Param('id') id: string,
    @Body({ schema: sendMessageSchema }) body: SendMessageDto,
    @CurrentUser() member: Member,
  ) {
    return this.messages.send(id, member.id, body.texto, body.citacao_id);
  }
}
