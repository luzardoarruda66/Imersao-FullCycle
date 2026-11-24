import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonEntity } from '../database/entities/person.entity.js';
import { DirectoryController } from './directory.controller.js';
import { DirectoryService } from './directory.service.js';

/** Leitura de pessoas: a busca e o Perfil. Só leitura; quem cria e troca contas é o módulo de contas. */
@Module({
  imports: [TypeOrmModule.forFeature([PersonEntity])],
  controllers: [DirectoryController],
  providers: [DirectoryService],
})
export class DirectoryModule {}
