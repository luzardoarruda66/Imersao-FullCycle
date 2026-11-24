import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module.js';
import { LoginAttemptsModule } from '../login-attempts/login-attempts.module.js';
import { LoginService } from './login.service.js';
import { MeController } from './me.controller.js';
import { PasswordService } from './password.service.js';
import { SessionAuth } from './session-auth.provider.js';
import { SessionsController } from './sessions.controller.js';
import { TypeOrmSessionStore } from './typeorm-session.store.js';

@Module({
  imports: [AccountsModule, LoginAttemptsModule],
  controllers: [SessionsController, MeController],
  providers: [SessionAuth, TypeOrmSessionStore, LoginService, PasswordService],
  exports: [TypeOrmSessionStore],
})
export class AuthModule {}
