"use client";

import { useActionState } from "react";
import { openDirectAction, type OpenDirectState } from "@/app/actions/conversations";
import { Avatar } from "@/app/components/ui/avatar";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { Spinner } from "@/app/components/ui/spinner";
import type { MemberOption } from "@/lib/conversations";

const IDLE: OpenDirectState = { status: "idle" };

function MemberList({ members }: { members: MemberOption[] }) {
  const [state, formAction, pending] = useActionState(openDirectAction, IDLE);

  return (
    <form action={formAction} className="flex flex-col gap-2 px-4 py-3">
      {members.length === 0 ? (
        <p className="px-2 py-4 text-body text-fg-muted">Não há outras pessoas no workspace para conversar ainda.</p>
      ) : (
        <ul className="flex max-h-96 flex-col overflow-y-auto">
          {members.map((member, index) => (
            <li key={member.id}>
              <button
                type="submit"
                name="membroId"
                value={member.id}
                disabled={pending}
                data-autofocus={index === 0 ? "" : undefined}
                className="flex w-full items-center gap-3 rounded-item px-2 py-2 text-left transition-colors duration-100 hover:bg-surface-subtle focus-visible:bg-surface-subtle disabled:pointer-events-none disabled:opacity-50"
              >
                <Avatar name={member.nome} />
                <span className="text-body font-bold text-fg">{member.nome}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <p role="status" className="flex items-center gap-2 px-2 text-small text-fg-muted">
          <Spinner /> Abrindo a conversa…
        </p>
      )}
      {state.status === "error" && !pending && (
        <p role="alert" className="px-2 text-small text-danger-fg">
          {state.message}
        </p>
      )}
    </form>
  );
}

/** Seletor de membro da conversa direta (frames `Canais / Conversa direta / ...`): só o nome, sem busca nem perfil (F1-03). */
export function NewDirectDialog({
  open,
  onOpenChange,
  members,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: MemberOption[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nova conversa" description="Escolha alguém para conversar em particular.">
        <MemberList members={members} />
      </DialogContent>
    </Dialog>
  );
}
