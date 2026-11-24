import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SessionError } from "@/app/components/auth/session-error";
import { PersonNotFound } from "@/app/components/person/person-not-found";
import { PersonProfile } from "@/app/components/person/person-profile";
import { profilePath } from "@/lib/people";
import { getPerson } from "@/server/people";
import { getSessionState } from "@/server/session";

export default function PersonPage({ params }: PageProps<"/pessoas/[id]">) {
  return (
    <Suspense fallback={<div className="flex-1" aria-busy="true" />}>
      <Person params={params} />
    </Suspense>
  );
}

async function Person({ params }: { params: PageProps<"/pessoas/[id]">["params"] }) {
  const { id } = await params;
  const back = `/sessao-encerrada?para=${encodeURIComponent(profilePath(id))}`;
  const session = await getSessionState();
  if (session.kind === "none") redirect(back);
  if (session.kind === "unavailable") return <SessionError />;

  const person = await getPerson(id);
  if (person.kind === "invalid-session") redirect(back);
  if (person.kind === "unavailable") return <SessionError />;
  // Id que não existe ou que não é um UUID: a API responde igual, e a tela também.
  if (person.kind === "error") return <PersonNotFound />;

  return <PersonProfile person={person.data} />;
}
