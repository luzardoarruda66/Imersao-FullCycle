import type { Member } from './member.js';

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: Member;
  }
}
