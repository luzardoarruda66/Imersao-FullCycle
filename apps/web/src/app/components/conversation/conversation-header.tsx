"use client";

import { Hash, Lock, Users } from "lucide-react";
import { useState } from "react";
import { InviteDialog } from "@/app/components/conversation/invite-dialog";
import { ParticipantsDialog } from "@/app/components/conversation/participants-dialog";
import { Avatar } from "@/app/components/ui/avatar";
import type { ConversationDetail, MemberOption } from "@/lib/conversations";

/** Cabeçalho da conversa (component `ConversationHeader`): o nome, e no canal privado o botão dos participantes. */
export function ConversationHeader({
  conversation,
  currentMemberId,
  candidates,
}: {
  conversation: ConversationDetail;
  currentMemberId: string;
  /** Os membros que ainda não participam do canal privado, para o convite. */
  candidates: MemberOption[];
}) {
  const [participantsOpen, setParticipantsOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const participants = conversation.participantes ?? [];
  const isPrivate = conversation.tipo === "canal_privado";

  return (
    <header className="flex h-header shrink-0 items-center gap-3 border-b border-border-subtle px-4">
      <h1 className="flex min-w-0 items-center gap-2 text-title font-black text-fg">
        {conversation.tipo === "direta" ? (
          <Avatar name={conversation.nome} size="sm" />
        ) : conversation.tipo === "canal_privado" ? (
          <Lock size={18} aria-label="Canal privado" />
        ) : (
          <Hash size={18} aria-label="Canal" />
        )}
        <span className="truncate">{conversation.nome}</span>
      </h1>
      <div className="flex-1" />
      {isPrivate && (
        <>
          <button
            type="button"
            onClick={() => setParticipantsOpen(true)}
            aria-label={`Participantes, ${participants.length}`}
            className="flex h-7 items-center gap-1.5 rounded-control border border-border px-2 text-small font-bold text-fg-muted transition-colors duration-100 hover:bg-surface-subtle"
          >
            <Users size={16} aria-hidden />
            {participants.length}
          </button>
          <ParticipantsDialog
            open={participantsOpen}
            onOpenChange={setParticipantsOpen}
            channelName={conversation.nome}
            participants={participants}
            currentMemberId={currentMemberId}
            onInvite={() => {
              setParticipantsOpen(false);
              setInviteOpen(true);
            }}
          />
          <InviteDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            conversationId={conversation.id}
            channelName={conversation.nome}
            candidates={candidates}
          />
        </>
      )}
    </header>
  );
}
