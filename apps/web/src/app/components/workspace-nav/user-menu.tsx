"use client";

import { Lock, LogOut } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { signOutAction } from "@/app/actions/session";
import { ChangePasswordDialog } from "@/app/components/auth/change-password-dialog";
import { Avatar } from "@/app/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

/** Menu do usuário, aberto pelo avatar (component set `UserMenu`): cabeçalho com o nome, "Trocar senha" e "Sair do Full Cycle". */
export function UserMenu({ name }: { name: string }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <DropdownMenu>
        {/* O nome vem do conteúdo (texto só para leitor de tela), e não de `aria-label`: com as iniciais visíveis no botão,
            o `aria-label` as deixaria fora do nome acessível (regra `label-content-name-mismatch` do axe). */}
        <DropdownMenuTrigger className="rounded-item transition-opacity duration-100 hover:opacity-80">
          <Avatar name={name} />
          <span className="sr-only">Menu do usuário, {name}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-60">
          <DropdownMenuLabel className="flex items-center gap-3 py-1">
            <Avatar name={name} />
            <span className="text-body font-black text-fg">{name}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialogOpen(true)}>
            <Lock size={16} aria-hidden />
            Trocar senha
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() =>
              startTransition(async () => {
                const result = await signOutAction();
                if (result?.error) toast.error(result.error);
              })
            }>
            <LogOut size={16} aria-hidden />
            Sair do Full Cycle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChangePasswordDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
