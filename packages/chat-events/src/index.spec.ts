import { describe, expect, it } from 'vitest';
import { chatEventDraftSchema, chatEventSchema, compareEventIds, formatEventId, parseEventId } from './index.js';

describe('chat-events', () => {
  it('valida o evento de diagnóstico com o envelope', () => {
    const event = { id: 'a-1-0', tipo: 'diagnostico', dados: { mensagem: 'oi' }, momento: '2026-11-24T00:00:00.000Z' };
    expect(chatEventSchema.parse(event)).toEqual(event);
  });

  it('recusa tipo desconhecido e dados fora do formato', () => {
    expect(chatEventDraftSchema.safeParse({ tipo: 'outro', dados: {} }).success).toBe(false);
    expect(chatEventDraftSchema.safeParse({ tipo: 'diagnostico', dados: { mensagem: 1 } }).success).toBe(false);
  });

  it('formata, lê e compara identificadores', () => {
    const id = { epoch: 'abc', time: 10, seq: 2 };
    expect(parseEventId(formatEventId(id))).toEqual(id);
    expect(parseEventId('lixo')).toBeNull();
    expect(compareEventIds({ epoch: 'a', time: 10, seq: 1 }, { epoch: 'a', time: 10, seq: 2 })).toBeLessThan(0);
    expect(compareEventIds({ epoch: 'a', time: 11, seq: 0 }, { epoch: 'a', time: 10, seq: 9 })).toBeGreaterThan(0);
  });
});
