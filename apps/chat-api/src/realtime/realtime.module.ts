import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ConnectionRegistry } from './connection-registry.js';
import { DiagnosticsService } from './diagnostics.service.js';
import { EventPublisher } from './event-publisher.service.js';
import { PersonEventsStore } from './person-events.store.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RedisModule } from './redis.module.js';

@Module({
  imports: [RedisModule, AuthModule],
  providers: [ConnectionRegistry, PersonEventsStore, EventPublisher, DiagnosticsService, RealtimeGateway],
  exports: [EventPublisher, DiagnosticsService],
})
export class RealtimeModule {}
