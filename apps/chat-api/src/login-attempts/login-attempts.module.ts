import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoginAttemptEntity } from '../database/entities/login-attempt.entity.js';
import { LoginAttemptsService } from './login-attempts.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([LoginAttemptEntity])],
  providers: [LoginAttemptsService],
  exports: [LoginAttemptsService],
})
export class LoginAttemptsModule {}
