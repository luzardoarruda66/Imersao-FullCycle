import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ClientMessageRouter } from './client-message-router.js';
import { ConnectionRegistry } from './connection-registry.js';
import { DiagnosticsService } from './diagnostics.service.js';
import { EventPublisher } from './event-publisher.service.js';
import { PersonEventsStore } from './person-events.store.js';
import { RealtimeGateway } from './realtime.gateway.js';
import { RedisModule } from './redis.module.js';

@Module({
  imports: [RedisModule, AuthModule],
  providers: [ConnectionRegistry, PersonEventsStore, EventPublisher, ClientMessageRouter, DiagnosticsService, RealtimeGateway],
  exports: [EventPublisher, ClientMessageRouter, DiagnosticsService],
})
export class RealtimeModule {}
