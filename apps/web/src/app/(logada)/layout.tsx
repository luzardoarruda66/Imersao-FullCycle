import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SessionError } from "@/app/components/auth/session-error";
import { RealtimeConnection } from "@/app/components/realtime/realtime-connection";
import { Rail } from "@/app/components/workspace-nav/rail";
import { Sidebar } from "@/app/components/workspace-nav/sidebar";
import { getConversationList } from "@/server/conversations";
import { getSessionState } from "@/server/session";

export default function LoggedLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex-1 bg-surface" />}>
      <Shell>{children}</Shell>
    </Suspense>
  );
}

/** Casca logada: Rail com o menu do usuário, a lateral com as conversas e a conexão em tempo real da aba. */
async function Shell({ children }: { children: React.ReactNode }) {
  // Página por requisição: sem isto o Next acusa `Date.now()` instável na pré-renderização da casca.
  await connection();
  const session = await getSessionState();
  // Cookie que a API não reconhece: a rota apaga o cookie e manda para "Entrar".
  if (session.kind === "none") redirect("/sessao-encerrada?para=/");
  if (session.kind === "unavailable") return <SessionError />;

  const list = await getConversationList();
  if (list.kind === "invalid-session") redirect("/sessao-encerrada?para=/");
  // Sem a lista, a lateral mostra o erro e "Tentar de novo"; a queda da API não tira ninguém da sessão.

  return (
    <div className="flex h-screen">
      <RealtimeConnection />
      <Rail memberName={session.member.nome} />
      <Sidebar list={list.kind === "ok" ? list.data : null} />
      <main aria-label="Conversa" className="flex min-w-0 flex-1 flex-col bg-surface">
        {children}
      </main>
    </div>
  );
}
