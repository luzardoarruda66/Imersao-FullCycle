import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { SessionError } from "@/app/components/auth/session-error";
import { Rail } from "@/app/components/workspace-nav/rail";
import { getSessionState } from "@/server/session";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex-1 bg-surface" />}>
      <Shell />
    </Suspense>
  );
}

/** Casca logada: Rail com o menu do usuário. A sidebar e a conversa ficam vazias até a F1-02. */
async function Shell() {
  // Página por requisição: sem isto o Next acusa `Date.now()` instável na pré-renderização da casca.
  await connection();
  const session = await getSessionState();
  // Cookie que a API não reconhece: a rota apaga o cookie e manda para "Entrar".
  if (session.kind === "none") redirect("/sessao-encerrada?para=/");
  if (session.kind === "unavailable") return <SessionError />;
  return (
    <div className="flex h-screen">
      <Rail memberName={session.member.nome} />
      <aside aria-label="Conversas" className="w-sidebar shrink-0 bg-sidebar" />
      <main aria-label="Conversa" className="flex-1 bg-surface" />
    </div>
  );
}
