/** O Perfil de um membro, como a API do chat o devolve (snapshot OpenAPI, tag `pessoas`); só o que a tela usa. */
export interface PersonProfile {
  id: string;
  nome: string;
  usuario: string;
  cargo: string | null;
  telefone: string | null;
  status: string | null;
}

/** Um resultado da busca de pessoas: o suficiente para escolher e para distinguir `joao.silva` de `joao_silva`. */
export interface PersonSummary {
  id: string;
  nome: string;
  usuario: string;
}

/** O endereço do Perfil de uma pessoa: pelo id, para o link não quebrar se a operação trocar o @usuário. */
export const profilePath = (id: string) => `/pessoas/${id}`;
