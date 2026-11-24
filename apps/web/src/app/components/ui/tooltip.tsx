"use client";

import { Tooltip as Primitive } from "radix-ui";
import { cn } from "@/app/utils/cn";

/** Atraso de 400 ms antes de mostrar (design system, "Tooltip"). */
export const TOOLTIP_DELAY_MS = 400;

export const TooltipProvider = Primitive.Provider;
export const Tooltip = Primitive.Root;
export const TooltipTrigger = Primitive.Trigger;

export function TooltipContent({ className, ...props }: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        sideOffset={6}
        className={cn("z-50 rounded-control bg-fg px-2 py-1 text-caption font-bold text-fg-inverse", className)}
        {...props}
      />
    </Primitive.Portal>
  );
}
