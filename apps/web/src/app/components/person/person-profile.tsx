import type { PersonProfile as Profile } from "@/lib/people";
import { Avatar } from "@/app/components/ui/avatar";
import { cn } from "@/app/utils/cn";
import { OpenDirectButton } from "./open-direct-button";
import { ProfileHeader } from "./profile-header";

const NOT_PROVIDED = "Não informado";

function Field({ label, value }: { label: string; value: string | null }) {
  const filled = value !== null && value.trim() !== "";
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption font-bold text-fg-muted">{label}</dt>
      {/* `fg-muted` e não `fg-subtle`: o `fg-subtle` não chega ao contraste de 4,5:1 sobre a superfície clara. */}
      <dd className={cn("text-body", filled ? "text-fg" : "text-fg-muted")}>{filled ? value : NOT_PROVIDED}</dd>
    </div>
  );
}

/**
 * Página de Perfil (frames `Pessoas / Perfil / ...`): nome, @usuário, cargo, telefone e status de um membro.
 * Sem e-mail, sem presença (F1-07) e sem edição: todo membro vê o Perfil de todos, o próprio inclusive. O botão de
 * conversa direta só aparece no Perfil de outra pessoa: a conversa direta consigo mesmo é recusada (F1-02).
 */
export function PersonProfile({ person, isSelf }: { person: Profile; isSelf: boolean }) {
  return (
    <>
      <ProfileHeader />
      <div className="flex flex-col gap-6 overflow-y-auto p-8">
        <div className="flex w-full max-w-xl flex-col gap-6">
          <div className="flex items-center gap-5">
            <Avatar name={person.nome} size="xl" />
            <div className="flex min-w-0 flex-col gap-1">
              <h2 className="truncate text-heading font-black text-fg">{person.nome}</h2>
              <p className="text-small text-fg-muted">@{person.usuario}</p>
            </div>
          </div>
          <hr className="border-border-subtle" />
          <dl className="flex flex-col gap-4">
            <Field label="Cargo" value={person.cargo} />
            <Field label="Telefone" value={person.telefone} />
            <Field label="Status" value={person.status} />
          </dl>
          {!isSelf && <OpenDirectButton personId={person.id} />}
        </div>
      </div>
    </>
  );
}
