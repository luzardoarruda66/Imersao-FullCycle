import type { Repository } from 'typeorm';
import type { ConversationParticipantEntity } from '../database/entities/conversation-participant.entity.js';
import type { ConversationEntity, ConversationType } from '../database/entities/conversation.entity.js';
import type { PersonEntity } from '../database/entities/person.entity.js';
import { AppError } from '../errors/app-error.js';
import { ConversationAccessService } from './conversation-access.service.js';

const ID = '0192f4a0-0000-7000-8000-000000000001';
const PERSON = '0192f4a0-0000-7000-8000-000000000002';

function build(type: ConversationType | null, participates: boolean) {
  const conversations = { findOneBy: vi.fn().mockResolvedValue(type ? { id: ID, type } : null) };
  const participants = {
    existsBy: vi.fn().mockResolvedValue(participates),
    find: vi.fn().mockResolvedValue([{ personId: 'p1' }, { personId: 'p2' }]),
  };
  const people = { find: vi.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]) };
  const service = new ConversationAccessService(
    conversations as unknown as Repository<ConversationEntity>,
    participants as unknown as Repository<ConversationParticipantEntity>,
    people as unknown as Repository<PersonEntity>,
  );
  return { service, conversations, participants, people };
}

const codeOf = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    (error: unknown) => (error instanceof AppError ? `${error.code}:${error.getStatus()}` : 'outro'),
  );

describe('ConversationAccessService', () => {
  it('canal público: libera sem consultar participantes', async () => {
    const { service, participants } = build('canal_publico', false);
    await expect(service.requireAccess(ID, PERSON)).resolves.toMatchObject({ id: ID });
    expect(participants.existsBy).not.toHaveBeenCalled();
  });

  it.each(['canal_privado', 'direta'] as const)('%s: libera o participante', async (type) => {
    const { service } = build(type, true);
    await expect(service.requireAccess(ID, PERSON)).resolves.toMatchObject({ type });
  });

  it.each(['canal_privado', 'direta'] as const)('%s: quem está fora recebe conversa_inexistente', async (type) => {
    const { service } = build(type, false);
    expect(await codeOf(service.requireAccess(ID, PERSON))).toBe('conversa_inexistente:404');
  });

  it('conversa que não existe responde conversa_inexistente', async () => {
    const { service } = build(null, false);
    expect(await codeOf(service.requireAccess(ID, PERSON))).toBe('conversa_inexistente:404');
  });

  it('quem participa: todos os membros no canal público', async () => {
    const { service, participants } = build('canal_publico', false);
    expect(await service.participantIds({ id: ID, type: 'canal_publico' })).toEqual(['p1', 'p2', 'p3']);
    expect(participants.find).not.toHaveBeenCalled();
  });

  it.each(['canal_privado', 'direta'] as const)('quem participa: os participantes gravados em %s', async (type) => {
    const { service, people } = build(type, true);
    expect(await service.participantIds({ id: ID, type })).toEqual(['p1', 'p2']);
    expect(people.find).not.toHaveBeenCalled();
  });

  it('id que não é UUID responde igual, sem ir ao banco', async () => {
    const { service, conversations } = build('canal_publico', true);
    expect(await codeOf(service.requireAccess('nao-e-uuid', PERSON))).toBe('conversa_inexistente:404');
    expect(conversations.findOneBy).not.toHaveBeenCalled();
  });
});
