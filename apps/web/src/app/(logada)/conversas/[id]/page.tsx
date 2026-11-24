import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SessionError } from "@/app/components/auth/session-error";
import { ConversationHeader } from "@/app/components/conversation/conversation-header";
import { ConversationIntro } from "@/app/components/conversation/conversation-intro";
import { ConversationNotFound } from "@/app/components/conversation/conversation-not-found";
import { ConversationPane } from "@/app/components/conversation/conversation-pane";
import { conversationPath } from "@/lib/conversations";
import { getConversation, getMembers, getMessages } from "@/server/conversations";
import { getSessionState } from "@/server/session";

export default function ConversationPage({ params }: PageProps<"/conversas/[id]">) {
  return (
    <Suspense fallback={<div className="flex-1" aria-busy="true" />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: PageProps<"/conversas/[id]">["params"] }) {
  const { id } = await params;
  const back = `/sessao-encerrada?para=${encodeURIComponent(conversationPath(id))}`;
  const session = await getSessionState();
  if (session.kind === "none") redirect(back);
  if (session.kind === "unavailable") return <SessionError />;

  const [conversation, messages] = await Promise.all([getConversation(id), getMessages(id)]);
  if (conversation.kind === "invalid-session" || messages.kind === "invalid-session") redirect(back);
  if (conversation.kind === "unavailable" || messages.kind === "unavailable") return <SessionError />;
  // Id que não existe, canal privado ou conversa direta alheios: a API responde igual, e a tela também.
  if (conversation.kind === "error" || messages.kind === "error") return <ConversationNotFound />;

  const detail = conversation.data;
  // O convite lista só quem ainda não participa do canal privado.
  let candidates: { id: string; nome: string }[] = [];
  if (detail.tipo === "canal_privado") {
    const members = await getMembers();
    const participating = new Set((detail.participantes ?? []).map((participant) => participant.id));
    candidates = members.kind === "ok" ? members.data.filter((member) => !participating.has(member.id)) : [];
  }

  return (
    <>
      <ConversationHeader conversation={detail} currentMemberId={session.member.id} candidates={candidates} />
      <ConversationPane
        key={detail.id}
        conversationId={detail.id}
        placeholder={detail.tipo === "direta" ? `Mensagem para ${detail.nome}` : `Mensagem para #${detail.nome}`}
        initialMessages={messages.data.mensagens}
        initialHasMore={messages.data.tem_mais}
        currentMemberId={session.member.id}
        intro={<ConversationIntro type={detail.tipo} name={detail.nome} />}
      />
    </>
  );
}
