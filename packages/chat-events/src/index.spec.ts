import { describe, expect, it } from 'vitest';
import { chatEventDraftSchema, chatEventSchema, compareEventIds, formatEventId, isNewerEventId, parseEventId } from './index.js';

describe('chat-events', () => {
  it('valida o evento de diagnóstico com o envelope', () => {
    const event = { id: 'a-1-0', tipo: 'diagnostico', dados: { mensagem: 'oi' }, momento: '2026-11-24T00:00:00.000Z' };
    expect(chatEventSchema.parse(event)).toEqual(event);
  });

  it('valida os eventos de mensagem criada e de conversa visível', () => {
    const mensagem = {
      id: 'm1',
      conversa_id: 'c1',
      autor: { id: 'p1', nome: 'Ana' },
      texto: 'oi',
      criada_em: '2026-11-24T00:00:00.000Z',
    };
    const base = { id: 'a-1-0', momento: '2026-11-24T00:00:00.000Z' };
    expect(chatEventSchema.parse({ ...base, tipo: 'mensagem_criada', dados: { conversa_id: 'c1', mensagem } }).tipo).toBe('mensagem_criada');
    expect(chatEventSchema.parse({ ...base, tipo: 'conversa_visivel', dados: { conversa_id: 'c1' } }).tipo).toBe('conversa_visivel');
    expect(chatEventDraftSchema.safeParse({ tipo: 'mensagem_criada', dados: { conversa_id: 'c1' } }).success).toBe(false);
    expect(chatEventDraftSchema.safeParse({ tipo: 'conversa_visivel', dados: {} }).success).toBe(false);
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

  it('isNewerEventId compara na mesma época e trata outra época ou lixo como novo', () => {
    expect(isNewerEventId('e-10-1', 'e-10-0')).toBe(true);
    expect(isNewerEventId('e-10-1', 'e-10-1')).toBe(false);
    expect(isNewerEventId('e-9-5', 'e-10-0')).toBe(false);
    expect(isNewerEventId('x-1-0', 'e-10-0')).toBe(true);
    expect(isNewerEventId('lixo', 'e-10-0')).toBe(true);
  });
});
