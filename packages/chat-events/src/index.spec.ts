import { describe, expect, it } from 'vitest';
import {
  CLIENT_MESSAGES,
  chatEventDraftSchema,
  chatMessageSchema,
  chatEventSchema,
  compareEventIds,
  formatEventId,
  isLiveOnly,
  isNewerEventId,
  parseEventId,
  readCountsSchema,
  typingMessageSchema,
} from './index.js';

describe('chat-events', () => {
  it('valida o evento de diagnóstico com o envelope', () => {
    const event = { id: 'a-1-0', tipo: 'diagnostico', dados: { mensagem: 'oi' }, momento: '2026-11-24T00:00:00.000Z' };
    expect(chatEventSchema.parse(event)).toEqual(event);
  });

  it('valida os eventos de mensagem criada e de conversa visível', () => {
    const mensagem = {
      id: 'm1',
      conversa_id: 'c1',
      autor: { id: 'p1', nome: 'Ana', usuario: 'ana' },
      texto: 'oi',
      criada_em: '2026-11-24T00:00:00.000Z',
    };
    const base = { id: 'a-1-0', momento: '2026-11-24T00:00:00.000Z' };
    expect(chatEventSchema.parse({ ...base, tipo: 'mensagem_criada', dados: { conversa_id: 'c1', mensagem, contagens: { nao_lidas: 1, mencoes: 0 } } }).tipo).toBe('mensagem_criada');
    expect(chatEventSchema.parse({ ...base, tipo: 'conversa_visivel', dados: { conversa_id: 'c1' } }).tipo).toBe('conversa_visivel');
    expect(chatEventDraftSchema.safeParse({ tipo: 'mensagem_criada', dados: { conversa_id: 'c1' } }).success).toBe(false);
    expect(chatEventDraftSchema.safeParse({ tipo: 'conversa_visivel', dados: {} }).success).toBe(false);
  });

  it('valida os eventos da F1-04: contagem atualizada e digitando', () => {
    const base = { id: 'a-1-0', momento: '2026-11-24T00:00:00.000Z' };
    const counts = { conversa_id: 'c1', nao_lidas: 0, mencoes: 0 };
    expect(chatEventSchema.parse({ ...base, tipo: 'contagem_atualizada', dados: counts }).tipo).toBe('contagem_atualizada');
    expect(chatEventDraftSchema.safeParse({ tipo: 'contagem_atualizada', dados: { ...counts, nao_lidas: -1 } }).success).toBe(false);
    const typing = { conversa_id: 'c1', pessoa: { id: 'p1', usuario: 'ana' } };
    expect(chatEventSchema.parse({ ...base, tipo: 'digitando', dados: typing }).tipo).toBe('digitando');
    expect(chatEventDraftSchema.safeParse({ tipo: 'digitando', dados: { conversa_id: 'c1' } }).success).toBe(false);
  });

  it('valida o formato da mensagem da F1-05: menções, citação, edição e exclusão', () => {
    const base = {
      id: 'm1',
      conversa_id: 'c1',
      autor: { id: 'p1', nome: 'Ana', usuario: 'ana' },
      texto: 'oi @bia',
      criada_em: '2026-11-24T00:00:00.000Z',
    };
    // Sem os campos novos (evento guardado antes da F1-05), assume os valores vazios.
    expect(chatMessageSchema.parse(base)).toEqual({ ...base, mencoes: [], citacao: null, editada_em: null, apagada: false });
    const full = {
      ...base,
      mencoes: [{ id: 'p2', usuario: 'bia' }],
      citacao: { id: 'm0', autor: { id: 'p2', nome: 'Bia', usuario: 'bia' }, trecho: 'olá', apagada: false },
      editada_em: '2026-11-24T00:01:00.000Z',
      apagada: false,
    };
    expect(chatMessageSchema.parse(full)).toEqual(full);
    expect(chatMessageSchema.safeParse({ ...full, mencoes: [{ id: 'p2' }] }).success).toBe(false);
    expect(chatMessageSchema.safeParse({ ...full, citacao: { id: 'm0' } }).success).toBe(false);
    expect(chatMessageSchema.safeParse({ ...full, apagada: 'sim' }).success).toBe(false);
  });

  it('valida o evento de mensagem editada, com a mensagem completa', () => {
    const base = { id: 'a-1-0', momento: '2026-11-24T00:00:00.000Z' };
    const mensagem = {
      id: 'm1',
      conversa_id: 'c1',
      autor: { id: 'p1', nome: 'Ana', usuario: 'ana' },
      texto: 'depois',
      criada_em: '2026-11-24T00:00:00.000Z',
      editada_em: '2026-11-24T00:01:00.000Z',
    };
    expect(chatEventSchema.parse({ ...base, tipo: 'mensagem_editada', dados: { conversa_id: 'c1', mensagem } }).tipo).toBe('mensagem_editada');
    expect(chatEventDraftSchema.safeParse({ tipo: 'mensagem_editada', dados: { conversa_id: 'c1' } }).success).toBe(false);
    expect(isLiveOnly('mensagem_editada')).toBe(false);
  });

  it('só o digitando é ao vivo; os outros eventos entram na reposição', () => {
    expect(isLiveOnly('digitando')).toBe(true);
    expect(isLiveOnly('mensagem_criada')).toBe(false);
    expect(isLiveOnly('contagem_atualizada')).toBe(false);
  });

  it('valida a mensagem do cliente digitando', () => {
    expect(CLIENT_MESSAGES.typing).toBe('digitando');
    expect(typingMessageSchema.safeParse({ conversa_id: 'c1' }).success).toBe(true);
    expect(typingMessageSchema.safeParse({}).success).toBe(false);
    expect(typingMessageSchema.safeParse({ conversa_id: 1 }).success).toBe(false);
  });

  it('valida o corpo da leitura e a resposta com contagens', () => {
    expect(readCountsSchema.parse({ nao_lidas: 2, mencoes: 0 })).toEqual({ nao_lidas: 2, mencoes: 0 });
    expect(readCountsSchema.safeParse({ nao_lidas: 2.5, mencoes: 0 }).success).toBe(false);
  });

  it('valida os eventos da F1-04: contagem atualizada e digitando', () => {
    const base = { id: 'a-1-0', momento: '2026-11-24T00:00:00.000Z' };
    const counts = { conversa_id: 'c1', nao_lidas: 0, mencoes: 0 };
    expect(chatEventSchema.parse({ ...base, tipo: 'contagem_atualizada', dados: counts }).tipo).toBe('contagem_atualizada');
    expect(chatEventDraftSchema.safeParse({ tipo: 'contagem_atualizada', dados: { ...counts, nao_lidas: -1 } }).success).toBe(false);
    const typing = { conversa_id: 'c1', pessoa: { id: 'p1', usuario: 'ana' } };
    expect(chatEventSchema.parse({ ...base, tipo: 'digitando', dados: typing }).tipo).toBe('digitando');
    expect(chatEventDraftSchema.safeParse({ tipo: 'digitando', dados: { conversa_id: 'c1' } }).success).toBe(false);
  });

  it('só o digitando é ao vivo; os outros eventos entram na reposição', () => {
    expect(isLiveOnly('digitando')).toBe(true);
    expect(isLiveOnly('mensagem_criada')).toBe(false);
    expect(isLiveOnly('contagem_atualizada')).toBe(false);
  });

  it('valida a mensagem do cliente digitando', () => {
    expect(CLIENT_MESSAGES.typing).toBe('digitando');
    expect(typingMessageSchema.safeParse({ conversa_id: 'c1' }).success).toBe(true);
    expect(typingMessageSchema.safeParse({}).success).toBe(false);
    expect(typingMessageSchema.safeParse({ conversa_id: 1 }).success).toBe(false);
  });

  it('valida as contagens', () => {
    expect(readCountsSchema.parse({ nao_lidas: 2, mencoes: 0 })).toEqual({ nao_lidas: 2, mencoes: 0 });
    expect(readCountsSchema.safeParse({ nao_lidas: 2.5, mencoes: 0 }).success).toBe(false);
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
