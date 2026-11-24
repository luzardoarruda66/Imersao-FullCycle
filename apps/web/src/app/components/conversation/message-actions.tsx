"use client";

import { Ellipsis, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { IconButton } from "@/app/components/ui/icon-button";
import { cn } from "@/app/utils/cn";

/** Uma ação sobre a mensagem. A barra e o menu são montados desta lista: uma ação nova entra aqui e em mais nenhum lugar. */
export interface MessageAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void | Promise<void>;
  /** `danger` só pinta o item do menu (Apagar); os botões da barra têm um tom só. */
  tone?: "default" | "danger";
  /** Mostra um botão na barra, além do item no menu. Padrão: sim. */
  quick?: boolean;
}

/**
 * `MessageActions`: a barra que flutua no canto da mensagem (um botão por ação rápida e o menu "Mais ações" com todas
 * as ações). Não aparece sem ações, como na mensagem apagada. Fica escondida até o ponteiro passar pela mensagem ou o
 * foco entrar nela, e os botões continuam no `Tab`, então o teclado a alcança (por isso é um grupo, e não uma
 * `toolbar`, que prometeria navegação por setas). O pai precisa ser `group/message`.
 */
export function MessageActions({ actions }: { actions: MessageAction[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  if (actions.length === 0) return null;
  return (
    <div
      role="group"
      aria-label="Ações da mensagem"
      className={cn(
        "absolute -top-4 right-4 z-10 flex gap-0.5 rounded-card border border-border bg-surface-raised p-0.5 shadow-1 opacity-0 transition-opacity duration-100",
        "group-hover/message:opacity-100 group-focus-within/message:opacity-100",
        menuOpen && "opacity-100",
      )}
    >
      {actions
        .filter((item) => item.quick !== false)
        .map((item) => (
          <IconButton key={item.id} icon={item.icon} label={item.label} onClick={item.onSelect} />
        ))}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <IconButton icon={Ellipsis} label="Mais ações" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 min-w-0 px-0">
          {actions.map((item) => (
            <DropdownMenuItem
              key={item.id}
              onSelect={item.onSelect}
              className={cn("rounded-none px-4", item.tone === "danger" && "text-danger-fg")}
            >
              <item.icon size={16} aria-hidden />
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
