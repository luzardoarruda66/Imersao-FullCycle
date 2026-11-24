import { runContas } from '../src/cli/contas.command.js';
import { RECONNECT_RETENTION_MS } from '../src/config/values.js';
import { DiagnosticsService } from '../src/realtime/diagnostics.service.js';
import { EventPublisher } from '../src/realtime/event-publisher.service.js';
import { PASSWORD, createTestApp, sidFrom, type TestApp } from './support/test-app.js';

const ANA = 'ana@empresa.com';
const BIA = 'bia@empresa.com';
const SECOND = 1000;

describe('Tempo real (e2e Socket.IO)', () => {
  let t: TestApp;
  let diagnostics: DiagnosticsService;
  let anaId: string;
  let biaId: string;

  beforeEach(async () => {
    t = await createTestApp();
    diagnostics = t.app.get(DiagnosticsService);
    anaId = (await t.people.create({ email: ANA, name: 'Ana', password: PASSWORD })).id;
    biaId = (await t.people.create({ email: BIA, name: 'Bia', password: PASSWORD })).id;
  });
  afterEach(() => t.close());

  const login = async (email: string, ip = '10.0.0.1') => {
    const res = await t.http().post('/v1/sessoes').set('X-Forwarded-For', ip).send({ email, senha: PASSWORD });
    expect(res.status).toBe(201);
    return sidFrom(res)!;
  };

  describe('handshake', () => {
    it('aceita cookie válido e responde com o ponto de partida', async () => {
      const c = await t.connect({ cookie: await login(ANA) });
      await c.waitFor(() => c.ready.length === 1);
      expect(c.socket.connected).toBe(true);
      expect(c.ready[0]!.ultimo_evento).toMatch(/^[0-9a-f]+-\d+-0$/);
    });

    it('recusa sem cookie e com cookie inválido, com sessao_invalida', async () => {
      const without = await t.connect();
      expect(without.refusal?.code).toBe('sessao_invalida');
      const invalid = await t.connect({ cookie: `sid=${'a'.repeat(43)}` });
      expect(invalid.refusal?.code).toBe('sessao_invalida');
      expect(without.socket.connected).toBe(false);
    });

    it('recusa sessão já encerrada', async () => {
      const sid = await login(ANA);
      await t.http().delete('/v1/sessoes/atual').set('Cookie', sid).expect(204);
      const c = await t.connect({ cookie: sid });
      expect(c.refusal?.code).toBe('sessao_invalida');
    });

    it('recusa outra origem e origem ausente, com origem_invalida', async () => {
      const sid = await login(ANA);
      const other = await t.connect({ cookie: sid, origin: 'http://evil.example' });
      expect(other.refusal?.code).toBe('origem_invalida');
      const absent = await t.connect({ cookie: sid, origin: null });
      expect(absent.refusal?.code).toBe('origem_invalida');
    });
  });

  describe('entrega por pessoa', () => {
    it('entrega o diagnóstico só à pessoa certa, em todas as abas dela', async () => {
      const anaSid = await login(ANA);
      const [a1, a2, b1] = [
        await t.connect({ cookie: anaSid }),
        await t.connect({ cookie: anaSid }),
        await t.connect({ cookie: await login(BIA, '10.0.0.2') }),
      ];
      await Promise.all([a1, a2, b1].map((c) => c.waitFor(() => c.ready.length === 1)));

      await diagnostics.publish(anaId, 'oi, Ana');
      await a1.waitFor(() => a1.events.length === 1);
      await a2.waitFor(() => a2.events.length === 1);
      expect(a1.events[0]).toMatchObject({ tipo: 'diagnostico', dados: { mensagem: 'oi, Ana' } });
      expect(a1.events[0]!.id).toEqual(a2.events[0]!.id);
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(b1.events).toEqual([]);

      await diagnostics.publish(biaId, 'oi, Bia');
      await b1.waitFor(() => b1.events.length === 1);
      expect(a1.events).toHaveLength(1);
    });

    it('recusa publicar um evento fora do formato, antes de qualquer saída', async () => {
      const c = await t.connect({ cookie: await login(ANA) });
      await c.waitFor(() => c.ready.length === 1);
      const publisher = t.app.get(EventPublisher);
      await expect(publisher.publish(anaId, { tipo: 'outro', dados: {} } as never)).rejects.toThrow();
      await expect(publisher.publish(anaId, { tipo: 'diagnostico', dados: { mensagem: 1 } } as never)).rejects.toThrow();
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(c.events).toEqual([]);
    });
  });

  describe('reposição depois de uma queda', () => {
    it('repõe em ordem o que se perdeu, no mesmo formato do ao vivo, sem duplicar', async () => {
      const sid = await login(ANA);
      const first = await t.connect({ cookie: sid });
      await first.waitFor(() => first.ready.length === 1);
      await diagnostics.publish(anaId, 'e1');
      await first.waitFor(() => first.events.length === 1);
      const confirmed = first.events[0]!.id;
      first.close();

      await diagnostics.publish(anaId, 'e2');
      await diagnostics.publish(anaId, 'e3');
      await diagnostics.publish(anaId, 'e4');

      const second = await t.connect({ cookie: sid, lastEvent: confirmed });
      await second.waitFor(() => second.ready.length === 1);
      expect(second.events.map((e) => e.dados.mensagem)).toEqual(['e2', 'e3', 'e4']);
      expect(second.events[0]).toEqual({
        id: expect.any(String),
        tipo: 'diagnostico',
        dados: { mensagem: 'e2' },
        momento: expect.any(String),
      });
      expect(second.ready[0]!.ultimo_evento).toBe(second.events[2]!.id);
      expect(second.lost).toBe(0);
    });

    it('não repete nem perde o evento publicado durante a reposição', async () => {
      const sid = await login(ANA);
      const first = await t.connect({ cookie: sid });
      await first.waitFor(() => first.ready.length === 1);
      await diagnostics.publish(anaId, 'e0');
      await first.waitFor(() => first.events.length === 1);
      const confirmed = first.events[0]!.id;
      first.close();
      for (let i = 1; i <= 30; i++) await diagnostics.publish(anaId, `e${i}`);

      const second = await t.connect({ cookie: sid, lastEvent: confirmed });
      // Publica sem esperar a reposição terminar.
      const live = Promise.all([31, 32, 33].map((i) => diagnostics.publish(anaId, `e${i}`)));
      await live;
      await second.waitFor(() => second.ready.length === 1 && second.events.length >= 33);
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(second.events.map((e) => e.dados.mensagem)).toEqual(Array.from({ length: 33 }, (_, i) => `e${i + 1}`));
      expect(new Set(second.events.map((e) => e.id)).size).toBe(33);
    });

    it('a reposição traz só os eventos da própria pessoa', async () => {
      const sid = await login(ANA);
      const first = await t.connect({ cookie: sid });
      await first.waitFor(() => first.ready.length === 1);
      const start = first.ready[0]!.ultimo_evento!;
      first.close();
      await diagnostics.publish(biaId, 'só da Bia');
      await diagnostics.publish(anaId, 'da Ana');
      const second = await t.connect({ cookie: sid, lastEvent: start });
      await second.waitFor(() => second.ready.length === 1);
      expect(second.events.map((e) => e.dados.mensagem)).toEqual(['da Ana']);
    });

    it('responde perdido depois da retenção', async () => {
      const sid = await login(ANA);
      const first = await t.connect({ cookie: sid });
      await first.waitFor(() => first.ready.length === 1);
      await diagnostics.publish(anaId, 'velho');
      await first.waitFor(() => first.events.length === 1);
      const confirmed = first.events[0]!.id;
      first.close();
      t.clock.advance(RECONNECT_RETENTION_MS + SECOND);
      const second = await t.connect({ cookie: sid, lastEvent: confirmed });
      await second.waitFor(() => second.lost === 1);
      expect(second.events).toEqual([]);
      expect(second.ready).toEqual([]);
    });

    it('responde perdido quando o armazenamento foi apagado', async () => {
      const sid = await login(ANA);
      const first = await t.connect({ cookie: sid });
      await first.waitFor(() => first.ready.length === 1);
      await diagnostics.publish(anaId, 'e1');
      await first.waitFor(() => first.events.length === 1);
      const confirmed = first.events[0]!.id;
      first.close();
      await t.redis.flushdb();
      const second = await t.connect({ cookie: sid, lastEvent: confirmed });
      await second.waitFor(() => second.lost === 1);
    });

    it('responde perdido a uma aba sem eventos que ficou fora além da retenção', async () => {
      const sid = await login(ANA);
      const first = await t.connect({ cookie: sid });
      await first.waitFor(() => first.ready.length === 1);
      const start = first.ready[0]!.ultimo_evento!;
      first.close();
      await diagnostics.publish(anaId, 'perdido no meio');
      t.clock.advance(RECONNECT_RETENTION_MS + SECOND);
      await diagnostics.publish(anaId, 'aparou o anterior');
      const second = await t.connect({ cookie: sid, lastEvent: start });
      await second.waitFor(() => second.lost === 1);
      expect(second.events).toEqual([]);
    });

    it('responde perdido com identificador ilegível', async () => {
      const c = await t.connect({ cookie: await login(ANA), lastEvent: 'indisponivel' });
      await c.waitFor(() => c.lost === 1);
    });

    it('responde perdido depois de uma falha de gravação, mesmo com o Redis de volta', async () => {
      const sid = await login(ANA);
      const first = await t.connect({ cookie: sid });
      await first.waitFor(() => first.ready.length === 1);
      await diagnostics.publish(anaId, 'guardado');
      await first.waitFor(() => first.events.length === 1);
      const confirmed = first.events[0]!.id;

      t.redis.disconnect();
      await diagnostics.publish(anaId, 'sem registro');
      await first.waitFor(() => first.events.length === 2);
      void t.redis.connect();
      await t.waitRedis();

      const second = await t.connect({ cookie: sid, lastEvent: confirmed });
      await second.waitFor(() => second.lost === 1);
      // A reconexão seguinte, sem ponto de partida, começa numa época nova.
      const third = await t.connect({ cookie: sid });
      await third.waitFor(() => third.ready.length === 1);
      await diagnostics.publish(anaId, 'depois');
      await third.waitFor(() => third.events.length === 1);
    });

    it('com o Redis parado, o handshake e a entrega ao vivo seguem e a reconexão seguinte recebe perdido', async () => {
      const sid = await login(ANA);
      t.redis.disconnect();
      const c = await t.connect({ cookie: sid });
      await c.waitFor(() => c.ready.length === 1);
      expect(c.socket.connected).toBe(true);
      expect(c.ready[0]!.ultimo_evento).toBeNull();
      await diagnostics.publish(anaId, 'ao vivo');
      await c.waitFor(() => c.events.length === 1);
      const again = await t.connect({ cookie: sid, lastEvent: c.events[0]!.id });
      await again.waitFor(() => again.lost === 1);
    });
  });

  describe('sessão', () => {
    const closed = (c: { socket: { connected: boolean } }) => !c.socket.connected;

    it('fecha a conexão em até 5 s ao sair, sem derrubar outro navegador da mesma pessoa', async () => {
      const sidA = await login(ANA);
      const sidB = await login(ANA, '10.0.0.9');
      const a = await t.connect({ cookie: sidA });
      const b = await t.connect({ cookie: sidB });
      await a.waitFor(() => a.ready.length === 1);
      await b.waitFor(() => b.ready.length === 1);
      await t.http().delete('/v1/sessoes/atual').set('Cookie', sidA).expect(204);
      const started = Date.now();
      await a.waitFor(() => closed(a), 5000);
      expect(Date.now() - started).toBeLessThanOrEqual(5000);
      expect(a.disconnectReason).toBe('io server disconnect');
      expect(b.socket.connected).toBe(true);
    });

    it('fecha a conexão quando a sessão vence sem uso', async () => {
      const a = await t.connect({ cookie: await login(ANA) });
      await a.waitFor(() => a.ready.length === 1);
      t.clock.advance(31 * 24 * 60 * 60 * 1000);
      await a.waitFor(() => closed(a), 5000);
    });

    it('fecha as conexões quando a operação encerra as sessões, em outro processo', async () => {
      const a = await t.connect({ cookie: await login(ANA) });
      await a.waitFor(() => a.ready.length === 1);
      expect((await runContas(['encerrar-sessoes', ANA], t.app)).code).toBe(0);
      await a.waitFor(() => closed(a), 5000);
    });

    it('fecha as conexões quando a senha é redefinida, mantendo as de outra pessoa', async () => {
      const a = await t.connect({ cookie: await login(ANA) });
      const b = await t.connect({ cookie: await login(BIA, '10.0.0.2') });
      await a.waitFor(() => a.ready.length === 1);
      expect((await runContas(['redefinir-senha', ANA], t.app)).code).toBe(0);
      await a.waitFor(() => closed(a), 5000);
      expect(b.socket.connected).toBe(true);
    });

    it('fecha as outras conexões quando a senha é trocada, mantendo a da sessão atual', async () => {
      const sidA = await login(ANA);
      const sidB = await login(ANA, '10.0.0.9');
      const a = await t.connect({ cookie: sidA });
      const b = await t.connect({ cookie: sidB });
      await a.waitFor(() => a.ready.length === 1);
      await b.waitFor(() => b.ready.length === 1);
      await t.http().put('/v1/eu/senha').set('Cookie', sidA).send({ senha_atual: PASSWORD, nova_senha: 'Outra-Senha9!' }).expect(204);
      await b.waitFor(() => closed(b), 5000);
      expect(a.socket.connected).toBe(true);
    });
  });

  describe('desempenho', () => {
    it('entrega 20 eventos por segundo a 50 conexões com p95 ≤ 1 s', async () => {
      const sid = await login(ANA);
      const clients = [];
      for (let i = 0; i < 50; i++) clients.push(await t.connect({ cookie: sid }));
      await Promise.all(clients.map((c) => c.waitFor(() => c.ready.length === 1)));

      const arrivals = new Map<string, number[]>();
      const sentAt = new Map<string, number>();
      for (const c of clients) {
        c.socket.on('evento', (event: { dados: { mensagem: string } }) => {
          const list = arrivals.get(event.dados.mensagem) ?? [];
          list.push(Date.now());
          arrivals.set(event.dados.mensagem, list);
        });
      }
      const total = 200;
      const publishing: Promise<unknown>[] = [];
      for (let i = 0; i < total; i++) {
        const delay = (i * SECOND) / 20;
        publishing.push(
          new Promise<void>((resolve) =>
            setTimeout(() => {
              sentAt.set(`m${i}`, Date.now());
              void diagnostics.publish(anaId, `m${i}`).then(() => resolve());
            }, delay),
          ),
        );
      }
      await Promise.all(publishing);
      await clients[0]!.waitFor(() => arrivals.size === total && [...arrivals.values()].every((l) => l.length === 50), 15_000);

      const latencies: number[] = [];
      for (const [message, times] of arrivals) for (const time of times) latencies.push(time - sentAt.get(message)!);
      latencies.sort((a, b) => a - b);
      const p95 = latencies[Math.floor(latencies.length * 0.95)]!;
      expect(p95).toBeLessThanOrEqual(1000);
    }, 40_000);
  });
});
