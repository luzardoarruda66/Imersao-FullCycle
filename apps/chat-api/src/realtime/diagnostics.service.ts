import { Injectable } from '@nestjs/common';
import { EventPublisher } from './event-publisher.service.js';

/** Publica o evento de diagnóstico; sem rota pública, só os testes o chamam (spec da FD-03). */
@Injectable()
export class DiagnosticsService {
  constructor(private readonly publisher: EventPublisher) {}

  publish(personId: string, mensagem: string) {
    return this.publisher.publish(personId, { tipo: 'diagnostico', dados: { mensagem } });
  }
}
