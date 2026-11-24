import type { ReadCounts } from "chat-events";
import type { ConversationList } from "./conversations";

const BADGE_CEILING = 99;

/** O texto do selo: nada em zero (sem selo) e `99+` acima de 99. */
export function badgeText(count: number): string | null {
  if (count <= 0) return null;
  return count > BADGE_CEILING ? `${BADGE_CEILING}+` : String(count);
}

/** O que se acrescenta ao nome da conversa para o leitor de tela dizer as contagens: ", 3 não lidas, 2 menções". */
export function badgeSuffix(unread: number, mentions: number): string {
  const parts: string[] = [];
  const unreadText = badgeText(unread);
  if (unreadText) parts.push(`${unreadText} ${unread === 1 ? "não lida" : "não lidas"}`);
  const mentionText = badgeText(mentions);
  if (mentionText) parts.push(`${mentionText} ${mentions === 1 ? "menção" : "menções"}`);
  return parts.map((part) => `, ${part}`).join("");
}

/** O nome acessível do item da lista: o nome da conversa com as contagens. */
export function badgeLabel(name: string, unread: number, mentions: number): string {
  return name + badgeSuffix(unread, mentions);
}

/** Grava as contagens de uma conversa na lista; uma conversa que a lista não tem não cria linha, e contagem igual devolve a mesma lista. */
export function setCounts(list: ConversationList, conversationId: string, counts: ReadCounts): ConversationList {
  let changed = false;
  const update = <T extends { id: string; nao_lidas: number; mencoes: number }>(items: T[]): T[] =>
    items.map((item) => {
      if (item.id !== conversationId) return item;
      if (item.nao_lidas === counts.nao_lidas && item.mencoes === counts.mencoes) return item;
      changed = true;
      return { ...item, nao_lidas: counts.nao_lidas, mencoes: counts.mencoes };
    });
  const next = {
    canais_publicos: update(list.canais_publicos),
    canais_privados: update(list.canais_privados),
    diretas: update(list.diretas),
  };
  return changed ? next : list;
}
