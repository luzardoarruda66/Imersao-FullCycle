import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DirectoryService } from './directory.service.js';

@ApiTags('pessoas')
@Controller('pessoas')
export class DirectoryController {
  constructor(private readonly directory: DirectoryService) {}

  @ApiOperation({ summary: 'O Perfil de um membro: nome, @usuário, cargo, telefone e status' })
  @Get(':id')
  profile(@Param('id') id: string) {
    return this.directory.profile(id);
  }
}
