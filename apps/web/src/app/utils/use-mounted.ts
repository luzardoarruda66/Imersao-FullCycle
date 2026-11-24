import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** `false` no servidor e na hidratação, `true` no navegador depois dela: o que depende do fuso ou da hora local espera por isto. */
export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
