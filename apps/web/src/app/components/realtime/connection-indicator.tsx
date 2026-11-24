"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/app/utils/cn";
import { getRealtimeClient } from "@/lib/realtime/realtime";

const noop = () => () => {};

/**
 * Indicador de conexão da casca (component `ConnectionIndicator`): "conectado" ou "reconectando", em texto e não só
 * em cor. A região é educada e fica sempre no DOM, para o leitor de tela anunciar a mudança; antes da primeira
 * conexão ela está vazia, e a página não pisca "reconectando" ao abrir.
 */
export function ConnectionIndicator() {
  const state = useSyncExternalStore(
    (listener) => (typeof window === "undefined" ? noop() : getRealtimeClient().subscribeState(listener)),
    () => getRealtimeClient().getState(),
    () => "connecting" as const,
  );
  const label = state === "connected" ? "Conectado" : state === "reconnecting" ? "Reconectando" : "";
  return (
    <div role="status" aria-live="polite" className="flex h-6 items-center gap-2 px-4 text-small text-sidebar-fg">
      {label && (
        <>
          <span aria-hidden className={cn("size-2 rounded-pill", state === "connected" ? "bg-success" : "bg-warning")} />
          {label}
        </>
      )}
    </div>
  );
}
