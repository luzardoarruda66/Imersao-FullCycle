import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { searchPeopleSchema, type SearchPeopleDto } from './directory.schemas.js';
import { DirectoryService } from './directory.service.js';

@ApiTags('pessoas')
@Controller('pessoas')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @ApiOperation({ summary: 'Buscar pessoas por parte do nome ou do @usuário' })
  @ApiQuery({ name: 'busca', required: false, description: 'Parte do nome ou do @usuário; vazia lista os primeiros membros' })
  @Get()
  async search(@Query({ schema: searchPeopleSchema }) query: SearchPeopleDto, @CurrentUser('id') personId: string) {
    return { pessoas: await this.directory.search(personId, query.busca) };
  }

  @ApiOperation({ summary: 'O Perfil de um membro: nome, @usuário, cargo, telefone e status' })
  @Get(':id')
  profile(@Param('id') id: string) {
    return this.directory.profile(id);
  }
}
