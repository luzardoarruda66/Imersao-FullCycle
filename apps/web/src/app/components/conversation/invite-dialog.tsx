"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { inviteAction, type InviteState } from "@/app/actions/conversations";
import { Avatar } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/app/components/ui/dialog";
import { cn } from "@/app/utils/cn";
import type { MemberOption } from "@/lib/conversations";

const IDLE: InviteState = { status: "idle" };

function InviteForm({
  conversationId,
  candidates,
  onDone,
}: {
  conversationId: string;
  candidates: MemberOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(inviteAction.bind(null, conversationId), IDLE);
  const [chosen, setChosen] = useState<string[]>([]);
  const toggle = (id: string) => setChosen((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  const chosenMembers = candidates.filter((member) => chosen.includes(member.id));

  useEffect(() => {
    if (state.status !== "success") return;
    toast.success("Pessoas convidadas");
    onDone();
    router.refresh();
  }, [state, onDone, router]);

  return (
    <form action={formAction}>
      <div className="flex flex-col gap-3 px-6 py-3">
        {candidates.length === 0 ? (
          <p className="py-4 text-body text-fg-muted">Todas as pessoas do workspace já participam deste canal.</p>
        ) : (
          <>
            {chosenMembers.length > 0 && (
              <ul aria-label="Escolhidas" className="flex flex-wrap gap-2">
                {chosenMembers.map((member) => (
                  <li key={member.id} className="flex items-center gap-1 rounded-pill bg-surface-inset py-1 pr-1 pl-3 text-small font-bold text-fg">
                    {member.nome}
                    <button
                      type="button"
                      aria-label={`Tirar ${member.nome}`}
                      onClick={() => toggle(member.id)}
                      className="flex size-5 items-center justify-center rounded-pill text-fg-muted hover:bg-surface-subtle"
                    >
                      <X size={12} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <ul aria-label="Pessoas para convidar" className="flex max-h-72 flex-col overflow-y-auto">
              {candidates.map((member, index) => {
                const isChosen = chosen.includes(member.id);
                return (
                  <li key={member.id}>
                    <button
                      type="button"
                      aria-pressed={isChosen}
                      onClick={() => toggle(member.id)}
                      data-autofocus={index === 0 ? "" : undefined}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-item px-2 py-2 text-left transition-colors duration-100 hover:bg-surface-subtle focus-visible:bg-surface-subtle",
                        isChosen && "bg-surface-subtle",
                      )}
                    >
                      <Avatar name={member.nome} />
                      <span className="flex-1 text-body font-bold text-fg">{member.nome}</span>
                      {isChosen && (
                        // O estado já vai em `aria-pressed`; o texto é só visual.
                        <span aria-hidden className="text-small font-bold text-primary">
                          Escolhida
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {chosen.map((id) => (
          <input key={id} type="hidden" name="membroId" value={id} />
        ))}
        {state.status === "error" && (
          <p role="alert" className="text-small text-danger-fg">
            {state.message}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 pt-3 pb-5">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pending} disabled={chosen.length === 0}>
          Convidar
        </Button>
      </div>
    </form>
  );
}

/** Diálogo "Convidar" de canal privado (frames `Canais / Convidar / ...`): lista só quem ainda não participa, sem busca. */
export function InviteDialog({
  open,
  onOpenChange,
  conversationId,
  channelName,
  candidates,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  channelName: string;
  candidates: MemberOption[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Convidar para #${channelName}`} description="Só quem está no canal vê as mensagens dele.">
        <InviteForm conversationId={conversationId} candidates={candidates} onDone={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
