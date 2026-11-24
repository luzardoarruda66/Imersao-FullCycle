import { DataSource, type DataSourceOptions } from 'typeorm';
import { AuthBase1790000000000 } from '../../migrations/1790000000000-AuthBase.js';
import { Conversations1790000000001 } from '../../migrations/1790000000001-Conversations.js';
import { Username1790000000002 } from '../../migrations/1790000000002-Username.js';
import { ReadState1790000000003 } from '../../migrations/1790000000003-ReadState.js';
import { Mentions1790000000004 } from '../../migrations/1790000000004-Mentions.js';
import { ConversationReadStateEntity } from './entities/conversation-read-state.entity.js';
import { ConversationParticipantEntity } from './entities/conversation-participant.entity.js';
import { ConversationEntity } from './entities/conversation.entity.js';
import { LoginAttemptEntity } from './entities/login-attempt.entity.js';
import { MentionEntity } from './entities/mention.entity.js';
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
      ConversationReadStateEntity,
      MentionEntity,
    ],
    migrations: [AuthBase1790000000000, Conversations1790000000001, Username1790000000002, ReadState1790000000003, Mentions1790000000004],
    synchronize: false,
    // Ids em UUID v7 gerados na aplicação; datas em UTC.
    extra: { options: '-c timezone=UTC' },
  };
}

// A CLI (`migration:run`, `migration:generate`) lê este export; é o único ponto fora do módulo de configuração que lê `process.env`.
export default new DataSource(buildDataSourceOptions(process.env.DATABASE_URL));
