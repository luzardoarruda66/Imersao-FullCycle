import { cn } from "@/app/utils/cn";
import { splitMentions, type MentionRef } from "@/lib/mentions";

/**
 * O texto de uma mensagem com as menções destacadas (`MentionChip`). Só vira destaque o `@usuário` que a API reconheceu
 * (`mencoes`); o resto do texto, `@` solto e e-mail inclusive, fica como texto comum, que o React escapa. A menção ao
 * próprio membro é amarela (`mention-self-*`), e a das outras pessoas, azul (design system, "MentionChip").
 */
export function MessageText({ text, mentions, currentMemberId }: { text: string; mentions: MentionRef[]; currentMemberId?: string }) {
  return (
    <>
      {splitMentions(text, mentions).map((segment, index) =>
        segment.mention ? (
          <span
            key={index}
            className={cn(
              "rounded-control px-0.5 font-bold",
              segment.mention.id === currentMemberId ? "bg-mention-self-bg text-mention-self-fg" : "bg-mention-bg text-mention-fg",
            )}
          >
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
