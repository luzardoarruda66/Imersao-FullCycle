/** O que a API do chat devolve das conversas (snapshot OpenAPI, tag `conversas`); só o que a tela usa. */
export type ConversationType = "canal_publico" | "canal_privado" | "direta";

export interface ConversationSummary {
  id: string;
  tipo: ConversationType;
  /** O nome do canal; na conversa direta, o nome da outra pessoa. */
  nome: string;
}

/** Um item da lista da lateral: a conversa com as contagens da pessoa. */
export interface ConversationListItem extends ConversationSummary {
  nao_lidas: number;
  mencoes: number;
}

export interface Participant {
  id: string;
  nome: string;
}

export interface ConversationDetail extends ConversationSummary {
  /** Só o canal privado traz os participantes. */
  participantes?: Participant[];
}

export interface ConversationList {
  canais_publicos: ConversationListItem[];
  canais_privados: ConversationListItem[];
  diretas: ConversationListItem[];
}

export interface MemberOption {
  id: string;
  nome: string;
}

/** O endereço de uma conversa. */
export const conversationPath = (id: string) => `/conversas/${id}`;
