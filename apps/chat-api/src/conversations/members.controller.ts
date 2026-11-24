import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Repository } from 'typeorm';
import { PersonEntity } from '../database/entities/person.entity.js';

@ApiTags('membros')
@Controller('membros')
export class MembersController {
  constructor(@InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>) {}

  /** Só id e nome: o seletor de convite e de conversa direta não precisa de mais, e o perfil é da F1-03. */
  @ApiOperation({ summary: 'Os membros do workspace, só id e nome' })
  @Get()
  async list() {
    const rows = await this.people
      .createQueryBuilder('p')
      .select(['p.id', 'p.name'])
      .orderBy('lower(p.name)', 'ASC')
      .addOrderBy('p.id', 'ASC')
      .getMany();
    return { membros: rows.map((row) => ({ id: row.id, nome: row.name })) };
  }
}
