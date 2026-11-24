import { v7 as uuidv7 } from 'uuid';
import { ConversationAccessService } from '../src/conversations/conversation-access.service.js';
import { ConversationEntity, type ConversationType } from '../src/database/entities/conversation.entity.js';
import { ConversationParticipantEntity } from '../src/database/entities/conversation-participant.entity.js';
import { AppError } from '../src/errors/app-error.js';
import { createTestApp, type TestApp } from './support/test-app.js';

describe('Serviço de participação (e2e)', () => {
  let t: TestApp;
  let access: ConversationAccessService;

  const person = (email: string, name: string) => t.createPerson({ email, name });

  const conversation = async (type: ConversationType, participants: string[], name: string | null = null) => {
    const entity = t.dataSource.getRepository(ConversationEntity).create({
      id: uuidv7(),
      type,
      name,
      directKey: type === 'direta' ? [...participants].sort().join(':') : null,
      createdBy: participants[0] ?? null,
    });
    await t.dataSource.getRepository(ConversationEntity).insert(entity);
    for (const personId of participants) {
      await t.dataSource
        .getRepository(ConversationParticipantEntity)
        .insert({ conversationId: entity.id, personId });
    }
    return entity;
  };

  const denialOf = async (conversationId: string, personId: string) => {
    const error = await access.requireAccess(conversationId, personId).then(
      () => undefined,
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppError);
    const appError = error as AppError;
    return { code: appError.code, status: appError.getStatus(), message: appError.message };
  };

  beforeEach(async () => {
    t = await createTestApp();
    access = t.app.get(ConversationAccessService);
  });
  afterEach(() => t.close());

  it('canal público: qualquer membro participa, sem registro de participante', async () => {
    const ana = await person('ana@empresa.com', 'Ana');
    const bia = await person('bia@empresa.com', 'Bia');
    const canal = await conversation('canal_publico', [], 'geral');
    expect((await access.requireAccess(canal.id, ana.id)).id).toBe(canal.id);
    expect((await access.requireAccess(canal.id, bia.id)).id).toBe(canal.id);
  });

  it('canal privado: só participante entra', async () => {
    const ana = await person('ana@empresa.com', 'Ana');
    const bia = await person('bia@empresa.com', 'Bia');
    const canal = await conversation('canal_privado', [ana.id], 'segredo');
    expect((await access.requireAccess(canal.id, ana.id)).type).toBe('canal_privado');
    await denialOf(canal.id, bia.id);
  });

  it('conversa direta: só os dois da conversa entram', async () => {
    const ana = await person('ana@empresa.com', 'Ana');
    const bia = await person('bia@empresa.com', 'Bia');
    const caio = await person('caio@empresa.com', 'Caio');
    const direta = await conversation('direta', [ana.id, bia.id]);
    expect((await access.requireAccess(direta.id, bia.id)).id).toBe(direta.id);
    await denialOf(direta.id, caio.id);
  });

  it('quem está fora recebe a mesma resposta de um id que nunca existiu', async () => {
    const ana = await person('ana@empresa.com', 'Ana');
    const bia = await person('bia@empresa.com', 'Bia');
    const privado = await conversation('canal_privado', [ana.id], 'segredo');
    const direta = await conversation('direta', [ana.id, bia.id]);
    const caio = await person('caio@empresa.com', 'Caio');

    const inexistente = await denialOf(uuidv7(), caio.id);
    expect(inexistente).toEqual({ code: 'conversa_inexistente', status: 404, message: expect.any(String) });
    expect(await denialOf(privado.id, caio.id)).toEqual(inexistente);
    expect(await denialOf(direta.id, caio.id)).toEqual(inexistente);
  });

  it('um id que não é UUID também responde como conversa inexistente', async () => {
    const ana = await person('ana@empresa.com', 'Ana');
    expect(await denialOf('nao-e-uuid', ana.id)).toMatchObject({ code: 'conversa_inexistente', status: 404 });
  });
});
