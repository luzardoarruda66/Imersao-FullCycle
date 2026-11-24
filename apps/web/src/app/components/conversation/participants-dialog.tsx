"use client";

import { Avatar } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import type { Participant } from "@/lib/conversations";

/** Participantes do canal privado (frames `Canais / Participantes / ...`): só os nomes, com o botão de convidar. */
export function ParticipantsDialog({
  open,
  onOpenChange,
  channelName,
  participants,
  currentMemberId,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelName: string;
  participants: Participant[];
  currentMemberId: string;
  onInvite: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={`Participantes de #${channelName}`} description="Quem lê as mensagens deste canal.">
        <ul aria-label="Participantes" className="flex max-h-80 flex-col overflow-y-auto px-6 py-3">
          {participants.map((participant) => (
            <li key={participant.id} className="flex items-center gap-3 py-2" data-autofocus={undefined}>
              <Avatar name={participant.nome} />
              <span className="text-body font-bold text-fg">
                {participant.nome}
                {participant.id === currentMemberId && <span className="font-normal text-fg-muted"> (você)</span>}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-end px-6 pt-3 pb-5">
          <Button type="button" onClick={onInvite} data-autofocus>
            Convidar pessoas
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
