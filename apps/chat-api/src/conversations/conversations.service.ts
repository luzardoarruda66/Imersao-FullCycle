import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';
import { ConversationParticipantEntity } from '../database/entities/conversation-participant.entity.js';
import { ConversationEntity, type ConversationType } from '../database/entities/conversation.entity.js';
import { PersonEntity } from '../database/entities/person.entity.js';
import { isUniqueViolation } from '../database/errors.js';
import { AppError } from '../errors/app-error.js';
import { ConversationAccessService } from './conversation-access.service.js';
import { ConversationEvents } from './conversation-events.service.js';
import type { CreateChannelDto } from './conversations.schemas.js';
import { directKey } from './direct-key.js';

export interface ConversationSummary {
  id: string;
  tipo: ConversationType;
  /** O nome do canal; na conversa direta, o nome da outra pessoa. */
  nome: string;
}

/** Um item da lista da lateral: a conversa com as contagens da pessoa (LLD, "Interfaces"). */
export type ConversationListItem = ConversationSummary & { nao_lidas: number; mencoes: number };

export interface Participant {
  id: string;
  nome: string;
}

export type ConversationDetail = ConversationSummary & { participantes?: Participant[] };

export interface ConversationList {
  canais_publicos: ConversationListItem[];
  canais_privados: ConversationListItem[];
  diretas: ConversationListItem[];
}

@Injectable()
export class ConversationsService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @InjectRepository(ConversationEntity) private readonly conversations: Repository<ConversationEntity>,
    @InjectRepository(ConversationParticipantEntity)
    private readonly participants: Repository<ConversationParticipantEntity>,
    @InjectRepository(PersonEntity) private readonly people: Repository<PersonEntity>,
    private readonly access: ConversationAccessService,
    private readonly events: ConversationEvents,
  ) {}

  /** As conversas que a pessoa vê, separadas por tipo e em ordem alfabética sem diferenciar maiúsculas. */
  async list(personId: string): Promise<ConversationList> {
    const channels = (type: ConversationType) =>
      this.conversations
        .createQueryBuilder('c')
        .where('c.type = :type', { type })
        .andWhere(
          type === 'canal_publico'
            ? '1 = 1'
            : 'EXISTS (SELECT 1 FROM conversation_participants cp WHERE cp.conversation_id = c.id AND cp.person_id = :personId)',
          { personId },
        )
        .orderBy('lower(c.name)', 'ASC')
        .addOrderBy('c.id', 'ASC')
        .getMany();
    const [publics, privates, directs, countRows] = await Promise.all([
      channels('canal_publico'),
      channels('canal_privado'),
      this.dataSource.query<{ id: string; name: string }[]>(
        `SELECT c.id, p.name
           FROM conversations c
           JOIN conversation_participants me ON me.conversation_id = c.id AND me.person_id = $1
           JOIN conversation_participants other ON other.conversation_id = c.id AND other.person_id <> $1
           JOIN people p ON p.id = other.person_id
          WHERE c.type = 'direta'
          ORDER BY lower(p.name), c.id`,
        [personId],
      ),
      this.dataSource.query<{ conversation_id: string; unread_count: number; mention_count: number }[]>(
        `SELECT conversation_id, unread_count, mention_count FROM conversation_read_states WHERE person_id = $1`,
        [personId],
      ),
    ]);
    const counts = new Map(countRows.map((row) => [row.conversation_id, row]));
    const withCounts = (summary: ConversationSummary): ConversationListItem => ({
      ...summary,
      nao_lidas: counts.get(summary.id)?.unread_count ?? 0,
      mencoes: counts.get(summary.id)?.mention_count ?? 0,
    });
    const channel = (c: ConversationEntity): ConversationListItem =>
      withCounts({ id: c.id, tipo: c.type, nome: c.name ?? '' });
    return {
      canais_publicos: publics.map(channel),
      canais_privados: privates.map(channel),
      diretas: directs.map((row) => withCounts({ id: row.id, tipo: 'direta', nome: row.name })),
    };
  }

  /** A conversa, pelo serviço de participação; o canal privado traz os participantes. */
  async get(conversationId: string, personId: string): Promise<ConversationDetail> {
    const conversation = await this.access.requireAccess(conversationId, personId);
    const summary = await this.summarize(conversation, personId);
    if (conversation.type !== 'canal_privado') return summary;
    return { ...summary, participantes: await this.participantsOf(conversation.id) };
  }

  async createChannel(personId: string, dto: CreateChannelDto): Promise<ConversationSummary> {
    const conversation = this.conversations.create({
      id: uuidv7(),
      type: dto.tipo === 'publico' ? 'canal_publico' : 'canal_privado',
      name: dto.nome,
      directKey: null,
      createdBy: personId,
    });
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.insert(ConversationEntity, conversation);
        // O público não grava participantes: todo membro participa. O privado começa com o criador.
        if (conversation.type === 'canal_privado') {
          await manager.insert(ConversationParticipantEntity, { conversationId: conversation.id, personId });
        }
      });
    } catch (error) {
      // O índice único decide a corrida entre dois canais com o mesmo nome.
      if (isUniqueViolation(error)) throw new AppError('nome_canal_em_uso', 409, 'Já existe um canal com esse nome.');
      throw error;
    }
    // Só depois do commit (ADR 0025).
    if (conversation.type === 'canal_publico') await this.events.publicChannelVisible(conversation.id);
    else await this.events.conversationVisible(conversation.id, [personId]);
    return { id: conversation.id, tipo: conversation.type, nome: dto.nome };
  }

  /** Abre a conversa direta com um membro, ou devolve a que já existe; os dois lados terminam na mesma. */
  async openDirect(personId: string, otherId: string): Promise<ConversationSummary> {
    if (otherId === personId) {
      throw new AppError('conversa_direta_consigo_mesmo', 422, 'Não é possível abrir uma conversa direta com você mesmo.');
    }
    const other = await this.people.findOneBy({ id: otherId });
    if (!other) throw new AppError('nao_encontrado', 404, 'Membro não encontrado.');
    const key = directKey(personId, otherId);
    const existing = () => this.conversations.findOneBy({ type: 'direta', directKey: key });

    let conversation = await existing();
    let created = false;
    if (!conversation) {
      const fresh = this.conversations.create({ id: uuidv7(), type: 'direta', name: null, directKey: key, createdBy: personId });
      try {
        await this.dataSource.transaction(async (manager) => {
          await manager.insert(ConversationEntity, fresh);
          await manager.insert(ConversationParticipantEntity, [
            { conversationId: fresh.id, personId },
            { conversationId: fresh.id, personId: otherId },
          ]);
        });
        conversation = fresh;
        created = true;
      } catch (error) {
        // O outro lado abriu ao mesmo tempo: o índice único do par deixou uma conversa só.
        if (!isUniqueViolation(error)) throw error;
        conversation = await existing();
      }
    }
    if (!conversation) throw new Error('A conversa direta deveria existir depois do conflito do índice único.');
    if (created) await this.events.conversationVisible(conversation.id, [personId, otherId]);
    return { id: conversation.id, tipo: 'direta', nome: other.name };
  }

  /** Convida membros para um canal privado; quem já participa fica como está. */
  async invite(conversationId: string, personId: string, memberIds: string[]): Promise<{ participantes: Participant[] }> {
    const conversation = await this.access.requireAccess(conversationId, personId);
    if (conversation.type !== 'canal_privado') {
      throw new AppError('conversa_nao_aceita_convite', 422, 'Só é possível convidar para um canal privado.');
    }
    const ids = [...new Set(memberIds)];
    const found = await this.people.find({ where: { id: In(ids) }, select: { id: true } });
    if (found.length !== ids.length) {
      throw new AppError('dados_invalidos', 400, 'Dados inválidos.', {
        campos: [{ campo: 'membros_ids', mensagem: 'Há membros que não existem.' }],
      });
    }
    const already = new Set((await this.participants.find({ where: { conversationId: conversation.id } })).map((row) => row.personId));
    const added = ids.filter((id) => !already.has(id));
    if (added.length > 0) {
      // `orIgnore`: um convite repetido ao mesmo tempo não falha nem duplica.
      await this.participants
        .createQueryBuilder()
        .insert()
        .values(added.map((id) => ({ conversationId: conversation.id, personId: id })))
        .orIgnore()
        .execute();
      await this.events.conversationVisible(conversation.id, added);
    }
    return { participantes: await this.participantsOf(conversation.id) };
  }

  private async summarize(conversation: ConversationEntity, personId: string): Promise<ConversationSummary> {
    if (conversation.type !== 'direta') return { id: conversation.id, tipo: conversation.type, nome: conversation.name ?? '' };
    const rows = await this.dataSource.query<{ name: string }[]>(
      `SELECT p.name FROM conversation_participants cp JOIN people p ON p.id = cp.person_id
        WHERE cp.conversation_id = $1 AND cp.person_id <> $2`,
      [conversation.id, personId],
    );
    return { id: conversation.id, tipo: 'direta', nome: rows[0]?.name ?? '' };
  }

  private async participantsOf(conversationId: string): Promise<Participant[]> {
    const rows = await this.dataSource.query<{ id: string; name: string }[]>(
      `SELECT p.id, p.name FROM conversation_participants cp JOIN people p ON p.id = cp.person_id
        WHERE cp.conversation_id = $1 ORDER BY cp.created_at, lower(p.name), p.id`,
      [conversationId],
    );
    return rows.map((row) => ({ id: row.id, nome: row.name }));
  }
}
