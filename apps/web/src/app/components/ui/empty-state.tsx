import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/utils/cn";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Densidade compacta (`py-6`), para dentro de diálogos e listas. */
  compact?: boolean;
  className?: string;
}

/** Estado vazio ou de erro (component `EmptyState`): ícone num quadro de 48, título, descrição e ação opcional. */
export function EmptyState({ icon: Icon, title, description, action, compact, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 text-center", compact ? "py-6" : "py-12", className)}>
      <div className="flex size-12 items-center justify-center rounded-card bg-surface-inset text-fg-muted">
        <Icon size={24} aria-hidden />
      </div>
      <h2 className="text-body font-black text-fg">{title}</h2>
      {description && <p className="max-w-md text-small text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
