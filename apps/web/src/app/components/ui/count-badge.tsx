import { cn } from "@/app/utils/cn";
import { badgeText } from "@/lib/unread";

/**
 * Selo de contagem (component `CountBadge`): `99+` acima de 99 e nada em zero. O texto é só visual (`aria-hidden`):
 * o nome acessível do item que o leva diz a contagem por extenso (`badgeLabel`).
 */
export function CountBadge({ count, tone = "unread" }: { count: number; tone?: "unread" | "mention" }) {
  const text = badgeText(count);
  if (!text) return null;
  return (
    <span
      aria-hidden
      className={cn(
        "flex h-4 min-w-4 shrink-0 items-center justify-center rounded-pill px-1 text-micro font-black",
        tone === "unread" ? "bg-badge text-on-badge" : "bg-mention-self-bg text-mention-self-fg",
      )}
    >
      {tone === "mention" ? `@${text}` : text}
    </span>
  );
}
