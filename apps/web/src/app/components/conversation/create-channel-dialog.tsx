"use client";

import { useActionState, useState, useTransition } from "react";
import { createChannelAction, type CreateChannelState } from "@/app/actions/conversations";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogClose, DialogContent } from "@/app/components/ui/dialog";
import { Field, Input } from "@/app/components/ui/field";
import { RadioGroup, RadioOption } from "@/app/components/ui/radio-option";
import { CHANNEL_NAME_MAX } from "@/lib/schemas";

const IDLE: CreateChannelState = { status: "idle" };

function CreateChannelForm() {
  const [state, formAction, pending] = useActionState(createChannelAction, IDLE);
  const [, startTransition] = useTransition();
  // Controlados: o React 19 limpa os campos não controlados depois do envio, e quem erra um campo não redigita o outro.
  const [nome, setNome] = useState("");
  // Sem tipo escolhido de antemão: o formulário nasce vazio e o envio sem escolha mostra o erro.
  const [tipo, setTipo] = useState("");
  const errors = state.status === "error" ? state.fieldErrors : undefined;

  // O envio à mão evita o reinício automático do formulário depois da ação: o Radix devolveria o tipo ao valor inicial,
  // e quem erra o nome teria de escolher o tipo de novo.
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="flex flex-col gap-4 px-6 py-3">
        <Field id="nome" label="Nome" hint={`De 1 a ${CHANNEL_NAME_MAX} caracteres.`} error={errors?.nome}>
          {(aria) => (
            <Input {...aria} name="nome" autoComplete="off" data-autofocus value={nome} onChange={(event) => setNome(event.target.value)} />
          )}
        </Field>
        <div className="flex flex-col gap-1">
          <span id="tipo-rotulo" className="text-body font-bold text-fg">
            Tipo
          </span>
          <RadioGroup
            aria-labelledby="tipo-rotulo"
            aria-describedby={errors?.tipo ? "tipo-erro" : undefined}
            value={tipo}
            onValueChange={setTipo}
          >
            <RadioOption
              value="publico"
              label="Público"
              description="Qualquer pessoa do workspace vê o canal e participa."
              invalid={!!errors?.tipo}
            />
            <RadioOption
              value="privado"
              label="Privado"
              description="Só quem for convidado vê o canal e participa."
              invalid={!!errors?.tipo}
            />
          </RadioGroup>
          <input type="hidden" name="tipo" value={tipo} />
          {errors?.tipo && (
            <p id="tipo-erro" role="alert" className="text-small text-danger-fg">
              {errors.tipo}
            </p>
          )}
        </div>
        {state.status === "error" && state.general && (
          <p role="alert" className="text-small text-danger-fg">
            {state.general}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-3 px-6 pt-3 pb-5">
        <DialogClose asChild>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" loading={pending}>
          Criar canal
        </Button>
      </div>
    </form>
  );
}

/** Diálogo "Criar canal" (frames `Canais / Criar canal / ...`). O formulário só existe com o diálogo aberto: reabrir começa limpo. */
export function CreateChannelDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Criar canal" description="Canais organizam a conversa por assunto, projeto ou time.">
        <CreateChannelForm />
      </DialogContent>
    </Dialog>
  );
}
