import { useSyncExternalStore } from "react";

const TICK_MS = 60_000;

const subscribe = (onChange: () => void) => {
  const timer = setInterval(onChange, TICK_MS);
  return () => clearInterval(timer);
};
/** A hora de agora, arredondada para baixo ao minuto: estável entre as leituras de um mesmo minuto. */
const snapshot = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;

/**
 * A hora de agora em milissegundos, atualizada a cada minuto, ou `null` no servidor e na hidratação. O que depende do
 * relógio (como o prazo para editar) espera por ela, para o HTML do servidor não divergir do navegador.
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
