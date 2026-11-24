import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { type ChatEvent, type ChatEventDraft, formatEventId, parseEventId } from 'chat-events';
import type { Redis } from 'ioredis';
import { Clock } from '../clock.js';
import { RECONNECT_RETENTION_MS } from '../config/values.js';
import { REDIS } from './redis.module.js';

const EPOCH_KEY = 'chat:epoch';
/** Época dos eventos que saíram ao vivo sem ser guardados: nenhum identificador dela serve de ponto de reposição. */
const UNSTORED_EPOCH = 'sem_registro';

export type ReadSinceResult = { status: 'ok'; events: ChatEvent[] } | { status: 'lost' };

// Anexa, apara e renova a validade num comando só. O instante nunca anda para trás: o Redis exige id crescente.
const APPEND_SCRIPT = `
local last = redis.call('XREVRANGE', KEYS[1], '+', '-', 'COUNT', 1)
local ms = tonumber(ARGV[1])
if #last > 0 then
  local lastMs = tonumber(string.match(last[1][1], '^(%d+)-'))
  if lastMs > ms then ms = lastMs end
end
local id = redis.call('XADD', KEYS[1], ms .. '-*', 'e', ARGV[4])
redis.call('XTRIM', KEYS[1], 'MINID', ARGV[2])
redis.call('PEXPIRE', KEYS[1], ARGV[3])
return id
`;

/** Eventos recentes de cada pessoa, num Redis Stream por pessoa (LLD, seção 2, "Eventos por pessoa (Redis)"). */
@Injectable()
export class PersonEventsStore {
  private readonly logger = new Logger(PersonEventsStore.name);
  /** Uma gravação falhou: a época é trocada assim que o Redis voltar a responder. */
  private epochDirty = false;
  private unstoredSeq = 0;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly clock: Clock,
  ) {}

  private streamKey(personId: string) {
    return `chat:events:${personId}`;
  }

  /** Guarda o evento e devolve-o com identificador e momento. Nunca rejeita: com o Redis fora, o evento sai sem registro e a época troca. */
  async append(personId: string, draft: ChatEventDraft): Promise<ChatEvent> {
    const now = this.clock.now();
    const momento = new Date(now).toISOString();
    try {
      const epoch = await this.currentEpoch();
      const streamId = (await this.redis.eval(
        APPEND_SCRIPT,
        1,
        this.streamKey(personId),
        String(now),
        String(now - RECONNECT_RETENTION_MS),
        String(RECONNECT_RETENTION_MS),
        JSON.stringify({ tipo: draft.tipo, dados: draft.dados, momento }),
      )) as string;
      return { id: `${epoch}-${streamId}`, tipo: draft.tipo, dados: draft.dados, momento } as ChatEvent;
    } catch (error) {
      this.epochDirty = true;
      this.logger.warn(`Evento não guardado: ${(error as Error).message}`);
      const id = formatEventId({ epoch: UNSTORED_EPOCH, time: now, seq: this.unstoredSeq++ });
      return { id, tipo: draft.tipo, dados: draft.dados, momento } as ChatEvent;
    }
  }

  /** O identificador atual da pessoa, ponto de partida de uma aba nova; `null` com o Redis fora. */
  async currentId(personId: string): Promise<string | null> {
    try {
      const epoch = await this.currentEpoch();
      const last = await this.redis.xrevrange(this.streamKey(personId), '+', '-', 'COUNT', 1);
      // Nunca anterior a "agora": o ponto de partida entra na regra de retenção como qualquer outro identificador.
      const floor = this.clock.now() - 1;
      const lastId = last[0]?.[0];
      if (lastId && Number(lastId.split('-')[0]) >= floor) return `${epoch}-${lastId}`;
      return formatEventId({ epoch, time: floor, seq: 0 });
    } catch {
      return null;
    }
  }

  /** Os eventos depois de `lastId`, ou `lost` quando não há como repor. */
  async readSince(personId: string, lastId: string): Promise<ReadSinceResult> {
    const parsed = parseEventId(lastId);
    if (!parsed) return { status: 'lost' };
    try {
      const epoch = await this.currentEpoch();
      if (parsed.epoch !== epoch) return { status: 'lost' };
      if (this.clock.now() - parsed.time > RECONNECT_RETENTION_MS) return { status: 'lost' };
      const entries = await this.redis.xrange(this.streamKey(personId), `(${parsed.time}-${parsed.seq}`, '+');
      const events = entries.map(([streamId, fields]) => {
        const stored = JSON.parse(fields[1]!) as Omit<ChatEvent, 'id'>;
        return { id: `${epoch}-${streamId}`, ...stored } as ChatEvent;
      });
      return { status: 'ok', events };
    } catch {
      return { status: 'lost' };
    }
  }

  /** Lê a época; cria uma se o Redis a perdeu, e troca-a se uma gravação falhou desde a última leitura. */
  private async currentEpoch(): Promise<string> {
    if (this.epochDirty) {
      await this.redis.set(EPOCH_KEY, newEpoch());
      this.epochDirty = false;
    }
    const existing = await this.redis.get(EPOCH_KEY);
    if (existing) return existing;
    await this.redis.set(EPOCH_KEY, newEpoch(), 'NX');
    return (await this.redis.get(EPOCH_KEY)) as string;
  }
}

const newEpoch = () => randomUUID().replaceAll('-', '');
