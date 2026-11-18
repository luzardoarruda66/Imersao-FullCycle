import { cn } from "@/app/utils/cn";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-9 w-full rounded-control border border-border-strong bg-surface px-3 text-body text-fg placeholder:text-fg-muted",
        "focus-visible:border-focus focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/30",
        "aria-invalid:border-danger aria-invalid:focus-visible:ring-danger/25",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

interface FieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: (aria: { id: string; "aria-invalid"?: true; "aria-describedby"?: string }) => React.ReactNode;
}

/** Rótulo + controle + dica ou erro. O erro é anunciado por leitor de tela (`role="alert"`). */
export function Field({ id, label, hint, error, children }: FieldProps) {
  const describedBy = error ? `${id}-erro` : hint ? `${id}-dica` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body font-bold text-fg">
        {label}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy })}
      {error ? (
        <p id={`${id}-erro`} role="alert" className="text-small text-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-dica`} className="text-small text-fg-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
