import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/utils/cn";

const avatarVariants = cva("inline-flex shrink-0 items-center justify-center font-black text-on-primary", {
  variants: {
    size: {
      xs: "size-5 rounded-control text-micro",
      sm: "size-6 rounded-control text-micro",
      md: "size-9 rounded-item text-small",
      lg: "size-12 rounded-item text-body",
      xl: "size-24 rounded-panel text-heading",
    },
  },
  defaultVariants: { size: "md" },
});

const COLORS = ["bg-avatar-1", "bg-avatar-2", "bg-avatar-3", "bg-avatar-4", "bg-avatar-5", "bg-avatar-6"];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0]!;
  const last = parts.length > 1 ? parts[parts.length - 1]![0]! : "";
  return (first + last).toUpperCase();
}

/** A cor vem de um hash estável do nome: a mesma pessoa tem sempre a mesma cor. */
function colorOf(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length]!;
}

export function Avatar({ name, size, className }: { name: string; className?: string } & VariantProps<typeof avatarVariants>) {
  return (
    <span aria-hidden className={cn(avatarVariants({ size }), colorOf(name), className)}>
      {initialsOf(name)}
    </span>
  );
}
