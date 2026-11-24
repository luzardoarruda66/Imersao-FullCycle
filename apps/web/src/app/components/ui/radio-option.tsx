"use client";

import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/app/utils/cn";

/** Grupo de escolha única (Radix RadioGroup): setas movem entre as opções e Espaço escolhe. */
export function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn("flex flex-col gap-2", className)} {...props} />;
}

interface RadioOptionProps {
  value: string;
  label: string;
  description: string;
  /** Borda `danger`: o grupo foi enviado sem escolha. A mensagem de erro fica no grupo, não aqui. */
  invalid?: boolean;
}

/** Opção do grupo (component set `RadioOption`): `Checked` tem borda `primary` de 2 px e ponto no indicador. */
export function RadioOption({ value, label, description, invalid }: RadioOptionProps) {
  const id = `tipo-${value}`;
  return (
    <RadioGroupPrimitive.Item
      value={value}
      aria-labelledby={`${id}-rotulo`}
      aria-describedby={`${id}-descricao`}
      aria-invalid={invalid || undefined}
      className={cn(
        "group flex w-full items-start gap-3 rounded-card border border-border-strong bg-surface p-3 text-left transition-colors duration-100",
        "hover:bg-surface-subtle focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/30",
        "data-[state=checked]:border-2 data-[state=checked]:border-primary",
        "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25",
      )}
    >
      <span
        aria-hidden
        className="mt-px flex size-[18px] shrink-0 items-center justify-center rounded-pill border-2 border-border-strong group-data-[state=checked]:border-primary group-aria-invalid:border-danger"
      >
        <RadioGroupPrimitive.Indicator className="size-2 rounded-pill bg-primary" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={`${id}-rotulo`} className="text-small font-bold text-fg">
          {label}
        </span>
        <span id={`${id}-descricao`} className="text-caption text-fg-muted">
          {description}
        </span>
      </span>
    </RadioGroupPrimitive.Item>
  );
}
