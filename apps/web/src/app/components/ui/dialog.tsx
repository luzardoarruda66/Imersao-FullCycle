"use client";

import { X } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/app/utils/cn";

export const Dialog = DialogPrimitive.Root;

/** Diálogo: largura máxima de 512, raio card, elevation-3; o foco vai para o primeiro campo (Radix). */
export function DialogContent({ title, description, children, className }: {
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 animate-fade-in bg-surface-overlay" />
      <DialogPrimitive.Content
        // O Radix focaria o botão de fechar, o primeiro da ordem de tab; o foco vai para o primeiro campo.
        onOpenAutoFocus={(event) => {
          const field = (event.currentTarget as HTMLElement).querySelector<HTMLElement>("[data-autofocus]");
          if (field) {
            event.preventDefault();
            field.focus();
          }
        }}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 animate-pop-in flex-col rounded-card bg-surface-raised shadow-3",
          className,
        )}
      >
        <div className="flex items-start gap-4 pt-5 pr-4 pb-2 pl-6">
          <div className="flex flex-1 flex-col gap-1">
            <DialogPrimitive.Title className="text-heading font-black text-fg">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-body text-fg-muted">{description}</DialogPrimitive.Description>
          </div>
          <DialogPrimitive.Close
            aria-label="Fechar"
            className="flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors duration-100 hover:bg-surface-subtle"
          >
            <X size={20} aria-hidden />
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const DialogClose = DialogPrimitive.Close;
