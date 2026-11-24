"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TOOLTIP_DELAY_MS } from "@/app/components/ui/tooltip";
import { cn } from "@/app/utils/cn";

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-control transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      tone: {
        default: "text-fg-muted hover:bg-surface-subtle hover:text-fg",
        danger: "text-danger-fg hover:bg-surface-subtle",
      },
      size: { sm: "size-7", md: "size-9" },
    },
    defaultVariants: { tone: "default", size: "sm" },
  },
);

type IconButtonProps = Omit<React.ComponentProps<"button">, "children"> &
  VariantProps<typeof iconButtonVariants> & { icon: LucideIcon; label: string };

/**
 * `IconButton`: o `label` é obrigatório e vira o `aria-label` e o tooltip (atraso de 400 ms). Ícone de 18 px; tamanhos
 * 28 (`sm`) e 36 (`md`).
 */
export function IconButton({ icon: Icon, label, tone, size, className, ...props }: IconButtonProps) {
  return (
    <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={label} className={cn(iconButtonVariants({ tone, size }), className)} {...props}>
            <Icon size={18} aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
