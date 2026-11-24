import { splitMentions, type MentionRef } from "@/lib/mentions";

/**
 * O texto de uma mensagem com as menções destacadas (`MentionChip`). Só vira destaque o `@usuário` que a API reconheceu
 * (`mencoes`); o resto do texto, `@` solto e e-mail inclusive, fica como texto comum, que o React escapa.
 */
export function MessageText({ text, mentions }: { text: string; mentions: MentionRef[] }) {
  return (
    <>
      {splitMentions(text, mentions).map((segment, index) =>
        segment.mention ? (
          <span key={index} className="rounded-control bg-mention-bg px-0.5 font-bold text-mention-fg">
            {segment.text}
          </span>
        ) : (
          <span key={index}>{segment.text}</span>
        ),
      )}
    </>
  );
}
