"use client";

import { AlertDialog } from "radix-ui";
import { Button } from "@/app/components/ui/button";

/**
 * `ConfirmDialog` (Radix AlertDialog): largura máxima de 448, foco em Cancelar e não fecha ao clicar fora. Enquanto a
 * ação roda (`pending`), trava os botões e o Esc. O erro da ação aparece no próprio diálogo, que continua aberto.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  quote,
  confirmLabel,
  tone = "default",
  pending = false,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  /** O que está para ser afetado, em destaque sob a descrição (o trecho da mensagem, por exemplo). */
  quote?: string;
  confirmLabel: string;
  tone?: "default" | "destructive";
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 animate-fade-in bg-surface-overlay" />
        <AlertDialog.Content
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          className="fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 animate-pop-in flex-col gap-3 rounded-card bg-surface-raised p-6 shadow-3"
        >
          <AlertDialog.Title className="text-heading font-black text-fg">{title}</AlertDialog.Title>
          <AlertDialog.Description className="text-body text-fg-muted">{description}</AlertDialog.Description>
          {quote && (
            <p className="line-clamp-3 rounded-control border-l-2 border-border-strong bg-surface-inset px-3 py-2 text-body break-words whitespace-pre-wrap text-fg">
              {quote}
            </p>
          )}
          {error && (
            <p role="alert" className="text-small text-danger-fg">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary" disabled={pending}>
                Cancelar
              </Button>
            </AlertDialog.Cancel>
            <Button variant={tone === "destructive" ? "danger" : "primary"} loading={pending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
