import type { ChatEvent, ChatMessage } from 'chat-events';
import { redactDeleted } from './redact-deleted.js';

const message = (id: string, texto: string, over: Partial<ChatMessage> = {}): ChatMessage => ({
  id,
  conversa_id: 'c1',
  autor: { id: 'p1', nome: 'Ana', usuario: 'ana' },
  texto,
  criada_em: '2026-11-24T10:00:00.000Z',
  mencoes: [{ id: 'p2', usuario: 'bia' }],
  citacao: null,
  editada_em: null,
  apagada: false,
  ...over,
});
const created = (m: ChatMessage, n = 1): ChatEvent =>
  ({ id: `a-1-${n}`, momento: 'x', tipo: 'mensagem_criada', dados: { conversa_id: m.conversa_id, mensagem: m, contagens: { nao_lidas: 1, mencoes: 1 } } }) as ChatEvent;
const edited = (m: ChatMessage, n = 2): ChatEvent => ({ id: `a-1-${n}`, momento: 'x', tipo: 'mensagem_editada', dados: { conversa_id: m.conversa_id, mensagem: m } }) as ChatEvent;
const deleted = (id: string, n = 3): ChatEvent => ({ id: `a-1-${n}`, momento: 'x', tipo: 'mensagem_apagada', dados: { conversa_id: 'c1', mensagem_id: id } }) as ChatEvent;
const quote = (id: string, trecho: string) => ({ id, autor: { id: 'p1', nome: 'Ana', usuario: 'ana' }, trecho, apagada: false });

describe('redactDeleted', () => {
  it('apaga o texto, as menções e a citação das mensagens criadas e editadas que foram apagadas depois', () => {
    const events = [created(message('m1', 'segredo')), edited(message('m1', 'segredo editado', { editada_em: 'y' })), deleted('m1')];
    const out = redactDeleted(events);
    for (const event of out.slice(0, 2)) {
      expect((event.dados as { mensagem: ChatMessage }).mensagem).toMatchObject({ texto: '', mencoes: [], citacao: null, apagada: true });
    }
    expect(JSON.stringify(out)).not.toContain('segredo');
    expect(out[2]).toEqual(events[2]);
  });

  it('mantém as contagens do evento criado e o resto do evento como está', () => {
    const out = redactDeleted([created(message('m1', 'segredo')), deleted('m1')]);
    expect(out[0]!.dados).toMatchObject({ conversa_id: 'c1', contagens: { nao_lidas: 1, mencoes: 1 } });
    expect(out[0]).toMatchObject({ id: 'a-1-1', tipo: 'mensagem_criada' });
  });

  it('apaga o trecho das citações à mensagem apagada, nos eventos de outras mensagens', () => {
    const reply = message('m2', 'resposta', { citacao: quote('m1', 'segredo') });
    const out = redactDeleted([created(message('m1', 'segredo')), created(reply, 2), deleted('m1')]);
    expect((out[1]!.dados as { mensagem: ChatMessage }).mensagem.citacao).toEqual({ ...quote('m1', ''), apagada: true });
    expect((out[1]!.dados as { mensagem: ChatMessage }).mensagem.texto).toBe('resposta');
    expect(JSON.stringify(out)).not.toContain('segredo');
  });

  it('não mexe no que não foi apagado, nem na mesma lista quando nada foi apagado', () => {
    const events = [created(message('m1', 'ficou')), edited(message('m2', 'outra'))];
    expect(redactDeleted(events)).toBe(events);
    const withOtherDeletion = [created(message('m1', 'ficou')), deleted('m9')];
    expect(redactDeleted(withOtherDeletion)[0]).toBe(withOtherDeletion[0]);
  });

  it('só vale a exclusão da mesma conversa', () => {
    const events = [created(message('m1', 'ficou', { conversa_id: 'c1' })), { ...deleted('m1'), dados: { conversa_id: 'c2', mensagem_id: 'm1' } } as ChatEvent];
    expect((redactDeleted(events)[0]!.dados as { mensagem: ChatMessage }).mensagem.texto).toBe('ficou');
  });
});
