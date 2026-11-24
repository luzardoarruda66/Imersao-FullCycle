import { cn } from "@/app/utils/cn";

/** Bloco de carregamento (component `Skeleton`): pulsa até 45% de opacidade; decorativo, o texto do estado vai em `role="status"`. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-control bg-surface-inset", className)} />;
}
