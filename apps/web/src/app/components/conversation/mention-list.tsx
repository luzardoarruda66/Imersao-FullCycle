import { Avatar } from "@/app/components/ui/avatar";
import { Spinner } from "@/app/components/ui/spinner";
import { cn } from "@/app/utils/cn";
import type { PersonSummary } from "@/lib/people";

export const mentionOptionId = (listId: string, person: PersonSummary) => `${listId}-${person.id}`;

/**
 * A lista de `@` sobre o campo de mensagem (`MentionOption`): os participantes da conversa, filtrados pelo que a pessoa
 * digitou. É um `listbox` ligado ao campo por `aria-activedescendant`; o foco nunca sai do campo. Sem resultado ou com
 * falha na busca, mostra o aviso no lugar das opções.
 */
export function MentionList({
  id,
  people,
  activeIndex,
  status,
  onChoose,
}: {
  id: string;
  people: PersonSummary[];
  activeIndex: number;
  status: "loading" | "ready" | "error";
  onChoose: (person: PersonSummary) => void;
}) {
  const notice =
    status === "error"
      ? "Não foi possível buscar as pessoas."
      : status === "ready" && people.length === 0
        ? "Nenhuma pessoa encontrada"
        : null;
  return (
    <div className="absolute inset-x-4 bottom-full z-20 mb-1 overflow-hidden rounded-card bg-surface-raised py-2 shadow-2">
      <ul id={id} role="listbox" aria-label="Pessoas para mencionar" className="flex max-h-64 flex-col overflow-y-auto">
        {people.map((person, index) => (
          <li
            key={person.id}
            id={mentionOptionId(id, person)}
            role="option"
            aria-selected={index === activeIndex}
            // O mouse não tira o foco do campo: o clique escolhe e o texto continua sendo digitado.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onChoose(person)}
            className={cn(
              "flex h-9 cursor-pointer items-center gap-3 px-3 text-body",
              index === activeIndex ? "bg-sidebar-active text-sidebar-on-active" : "text-fg hover:bg-surface-inset",
            )}
          >
            <Avatar name={person.nome} size="xs" />
            <span className="font-black">{person.nome}</span>
            <span className={index === activeIndex ? "text-sidebar-on-active" : "text-fg-muted"}>@{person.usuario}</span>
          </li>
        ))}
      </ul>
      {status === "loading" && people.length === 0 && (
        <div role="status" aria-label="Buscando pessoas" className="flex justify-center py-2 text-fg-muted">
          <Spinner />
        </div>
      )}
      {notice && (
        <p role="status" className="px-3 py-2 text-small text-fg-muted">
          {notice}
        </p>
      )}
    </div>
  );
}
