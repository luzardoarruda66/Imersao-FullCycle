"use client";

import { CircleAlert, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useRef, useState, useTransition } from "react";
import useSWR from "swr";
import { openDirectAction, type OpenDirectState } from "@/app/actions/conversations";
import { Avatar } from "@/app/components/ui/avatar";
import { Button, buttonVariants } from "@/app/components/ui/button";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Input } from "@/app/components/ui/field";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Spinner } from "@/app/components/ui/spinner";
import { cn } from "@/app/utils/cn";
import { profilePath, type PersonSummary } from "@/lib/people";

const IDLE: OpenDirectState = { status: "idle" };

class SessionEndedError extends Error {}

/** A busca pelo BFF. A leitura anterior é cancelada a cada digitação, e o SWR só entrega o resultado da chave atual. */
async function fetchPeople(url: string, signal: AbortSignal): Promise<PersonSummary[]> {
  const response = await fetch(url, { signal });
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
  const [term, setTerm] = useState("");
  const [inField, setInField] = useState(true);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(openDirectAction, IDLE);
  const [, startTransition] = useTransition();
  const field = useRef<HTMLInputElement>(null);
  const rows = useRef<(HTMLButtonElement | null)[]>([]);
  const inflight = useRef<AbortController | null>(null);

  const { data, error, isLoading, mutate } = useSWR(
    `/api/pessoas?busca=${encodeURIComponent(term)}`,
    (url: string) => {
      inflight.current?.abort();
      inflight.current = new AbortController();
      return fetchPeople(url, inflight.current.signal);
    },
    {
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      onError: (failure) => {
        // A sessão não vale mais: o BFF já apagou o cookie; reler a casca leva a "Entrar" (LLD, seção 8).
        if (failure instanceof SessionEndedError) router.refresh();
      },
    },
  );

  const results = data ?? [];
  const searching = term.trim() !== "";

  const open = (person: PersonSummary) => {
    if (pending) return;
    const form = new FormData();
    form.set("membroId", person.id);
    setChoosing(person.id);
    startTransition(() => formAction(form));
  };

  // O foco passa de verdade entre o campo e os resultados (e não por `aria-activedescendant`): cada linha tem um botão
  // e um link, e uma lista de opções não pode ter link dentro.
  const onFieldKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      rows.current[0]?.focus();
    } else if (event.key === "Enter" && searching) {
      // Com um termo, o primeiro resultado é o que o Enter abre (a linha vem destacada).
      event.preventDefault();
      open(results[0]!);
    }
  };

  const onRowKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      rows.current[Math.min(index + 1, results.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (index === 0) field.current?.focus();
      else rows.current[index - 1]?.focus();
    }
  };

  const listing = results.length > 0;
  return (
    <div className="flex flex-col gap-2 px-4 py-3">
      <div className="relative">
        <Search size={16} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-fg-muted" />
        <Input
          ref={field}
          role="searchbox"
          aria-label="Buscar por nome ou @usuário"
          placeholder="Buscar por nome ou @usuário"
          autoComplete="off"
          data-autofocus
          className="pl-9"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onFocus={() => setInField(true)}
          onBlur={() => setInField(false)}
          onKeyDown={onFieldKeyDown}
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
        <ul aria-label="Pessoas" className="flex max-h-96 flex-col overflow-y-auto">
          {results.map((person, index) => {
            const isChoosing = pending && choosing === person.id;
            const disabled = pending && !isChoosing;
            return (
              <li
                key={person.id}
                // Com um termo, a primeira linha vem destacada, inteira, enquanto o foco está no campo: é a que o Enter abre.
                className={cn("flex items-center gap-2 rounded-item", index === 0 && searching && inField && "bg-surface-subtle")}
              >
                <button
                  type="button"
                  ref={(node) => {
                    rows.current[index] = node;
                  }}
                  disabled={disabled}
                  onClick={() => open(person)}
                  onKeyDown={(event) => onRowKeyDown(event, index)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-item px-2 py-2 text-left transition-colors duration-100 hover:bg-surface-subtle focus-visible:bg-surface-subtle disabled:pointer-events-none disabled:opacity-50"
                >
                  <Avatar name={person.nome} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body font-bold text-fg">{person.nome}</span>
                    <span className="truncate text-small text-fg-muted">@{person.usuario}</span>
                  </span>
                  {isChoosing && <Spinner className="ml-auto text-fg-muted" />}
                </button>
                <Link
                  href={profilePath(person.id)}
                  aria-label={`Ver perfil de ${person.nome}`}
                  className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "shrink-0", disabled && "pointer-events-none opacity-50")}
                >
                  Ver perfil
                </Link>
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
