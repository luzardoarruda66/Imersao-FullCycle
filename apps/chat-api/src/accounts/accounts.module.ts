import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonEntity } from '../database/entities/person.entity.js';
import { PeopleService } from './people.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([PersonEntity])],
  providers: [PeopleService],
  exports: [PeopleService],
})
export class AccountsModule {}
