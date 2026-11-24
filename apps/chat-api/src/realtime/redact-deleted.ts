import type { ChatEvent, ChatMessage } from 'chat-events';

/** A mensagem de um evento sem o que ela dizia: o que sobra é "Mensagem apagada". */
const redacted = (message: ChatMessage): ChatMessage => ({ ...message, texto: '', mencoes: [], citacao: null, apagada: true });

/**
 * Na reposição depois de uma queda, esconde o que uma mensagem apagada dizia: o evento guardado que a criou ou a editou
 * ainda traz o texto, e o cliente que perdeu os dois eventos não pode vê-lo. Para cada `mensagem_apagada` da lista, as
 * mensagens anteriores a ela (criadas ou editadas) saem sem texto, menções e citação, e o trecho das citações a ela sai
 * vazio. O resto do evento, as contagens inclusive, fica como estava. Sem exclusão na lista, devolve a mesma lista.
 */
export function redactDeleted(events: ChatEvent[]): ChatEvent[] {
  const deleted = new Set<string>();
  for (const event of events) {
    if (event.tipo === 'mensagem_apagada') deleted.add(`${event.dados.conversa_id}/${event.dados.mensagem_id}`);
  }
  if (deleted.size === 0) return events;

  return events.map((event) => {
    if (event.tipo !== 'mensagem_criada' && event.tipo !== 'mensagem_editada') return event;
    const { conversa_id: conversationId, mensagem: message } = event.dados;
    if (deleted.has(`${conversationId}/${message.id}`)) {
      return { ...event, dados: { ...event.dados, mensagem: redacted(message) } } as ChatEvent;
    }
    const quote = message.citacao;
    if (quote && !quote.apagada && deleted.has(`${conversationId}/${quote.id}`)) {
      const citacao = { ...quote, trecho: '', apagada: true };
      return { ...event, dados: { ...event.dados, mensagem: { ...message, citacao } } } as ChatEvent;
    }
    return event;
  });
}
