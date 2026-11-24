import { DataSource, type DataSourceOptions } from 'typeorm';
import { AuthBase1790000000000 } from '../../migrations/1790000000000-AuthBase.js';
import { Conversations1790000000001 } from '../../migrations/1790000000001-Conversations.js';
import { ConversationParticipantEntity } from './entities/conversation-participant.entity.js';
import { ConversationEntity } from './entities/conversation.entity.js';
import { LoginAttemptEntity } from './entities/login-attempt.entity.js';
import { MessageEntity } from './entities/message.entity.js';
import { PersonEntity } from './entities/person.entity.js';
import { SessionEntity } from './entities/session.entity.js';

/** Opções compartilhadas pelo `TypeOrmModule` e pela CLI do TypeORM (ADR 0018). */
export function buildDataSourceOptions(url: string | undefined): DataSourceOptions {
  return {
    type: 'postgres',
    url,
    entities: [
      PersonEntity,
      SessionEntity,
      LoginAttemptEntity,
      ConversationEntity,
      ConversationParticipantEntity,
      MessageEntity,
    ],
    migrations: [AuthBase1790000000000, Conversations1790000000001],
    synchronize: false,
    // Ids em UUID v7 gerados na aplicação; datas em UTC.
    extra: { options: '-c timezone=UTC' },
  };
}

// A CLI (`migration:run`, `migration:generate`) lê este export; é o único ponto fora do módulo de configuração que lê `process.env`.
export default new DataSource(buildDataSourceOptions(process.env.DATABASE_URL));
