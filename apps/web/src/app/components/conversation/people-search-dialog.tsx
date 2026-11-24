"use client";

import { CircleAlert, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useId, useState, useTransition } from "react";
import useSWR from "swr";
import { openDirectAction, type OpenDirectState } from "@/app/actions/conversations";
import { Avatar } from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Input } from "@/app/components/ui/field";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Spinner } from "@/app/components/ui/spinner";
import { cn } from "@/app/utils/cn";
import type { PersonSummary } from "@/lib/people";

const IDLE: OpenDirectState = { status: "idle" };

class SessionEndedError extends Error {}

/** A busca pelo BFF. A resposta de uma busca anterior nunca aparece: o SWR só entrega o resultado da chave atual. */
async function fetchPeople(url: string): Promise<PersonSummary[]> {
  const response = await fetch(url);
  if (response.status === 401) throw new SessionEndedError();
  if (!response.ok) throw new Error("A busca falhou.");
  const body = (await response.json()) as { pessoas: PersonSummary[] };
  return body.pessoas;
}

function SearchSkeleton() {
  return (
    <div role="status" className="flex flex-col">
      <span className="sr-only">Buscando pessoas…</span>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3 px-2 py-2">
          <Skeleton className="size-9 rounded-item" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SearchBody() {
  const router = useRouter();
  const listId = useId();
  const [term, setTerm] = useState("");
  // Só a escolha por seta fica aqui; sem ela, vale o padrão (o primeiro resultado, quando há um termo).
  const [picked, setPicked] = useState<number | null>(null);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(openDirectAction, IDLE);
  const [, startTransition] = useTransition();

  const { data, error, isLoading, mutate } = useSWR(`/api/pessoas?busca=${encodeURIComponent(term)}`, fetchPeople, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    onError: (failure) => {
      // A sessão não vale mais: o BFF já apagou o cookie; reler a casca leva a "Entrar" (LLD, seção 8).
      if (failure instanceof SessionEndedError) router.refresh();
    },
  });

  const results = data ?? [];
  const searching = term.trim() !== "";
  const active = results.length === 0 ? -1 : Math.min(picked ?? (searching ? 0 : -1), results.length - 1);
  const optionId = (index: number) => `${listId}-${index}`;

  const open = (person: PersonSummary) => {
    if (pending) return;
    const form = new FormData();
    form.set("membroId", person.id);
    setChoosing(person.id);
    startTransition(() => formAction(form));
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setPicked(Math.min(active + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setPicked(Math.max(active - 1, 0));
    } else if (event.key === "Enter" && active >= 0) {
      event.preventDefault();
      open(results[active]!);
    }
  };

  const listing = results.length > 0;
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="relative">
        <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted" />
        <Input
          role="combobox"
          aria-label="Buscar por nome ou @usuário"
          aria-autocomplete="list"
          aria-expanded={listing}
          aria-controls={listing ? listId : undefined}
          aria-activedescendant={active >= 0 ? optionId(active) : undefined}
          placeholder="Buscar por nome ou @usuário"
          autoComplete="off"
          data-autofocus
          className="pl-9"
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setPicked(null);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {error ? (
        <EmptyState
          compact
          icon={CircleAlert}
          title="Não foi possível buscar"
          description="Confira a conexão e tente de novo. O termo digitado foi mantido."
          action={<Button onClick={() => mutate()}>Tentar de novo</Button>}
        />
      ) : isLoading ? (
        <SearchSkeleton />
      ) : !listing ? (
        <EmptyState
          compact
          icon={Search}
          title={searching ? "Ninguém encontrado" : "Ninguém por aqui ainda"}
          description={
            searching
              ? `Nenhum membro com “${term.trim()}” no nome ou no @usuário.`
              : "Não há outras pessoas no workspace para conversar ainda."
          }
        />
      ) : (
        <ul id={listId} role="listbox" aria-label="Pessoas" className="flex max-h-96 flex-col overflow-y-auto">
          {results.map((person, index) => {
            const isActive = index === active;
            const isChoosing = pending && choosing === person.id;
            const disabled = pending && !isChoosing;
            return (
              <li key={person.id} role="presentation" className="flex items-center gap-2">
                <div
                  id={optionId(index)}
                  role="option"
                  aria-selected={isActive}
                  aria-disabled={disabled || undefined}
                  onClick={() => open(person)}
                  className={cn(
                    "flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-item px-2 py-2 transition-colors duration-100 hover:bg-surface-subtle",
                    isActive && "bg-surface-subtle",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  <Avatar name={person.nome} />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-body font-bold text-fg">{person.nome}</span>
                    <span className="truncate text-small text-fg-muted">@{person.usuario}</span>
                  </div>
                  {isChoosing && <Spinner className="ml-auto text-fg-muted" />}
                </div>
              </li>
            );
          })}
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
    </div>
  );
}

/** Busca de pessoas para abrir uma conversa direta (frames `Pessoas / Buscar / ...`): nome ou @usuário, sem presença. */
export function PeopleSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Nova conversa" description="Busque por nome ou @usuário para conversar em particular.">
        <SearchBody />
      </DialogContent>
    </Dialog>
  );
}
