/** `%`, `_` e a barra valem como texto comum no `LIKE ... ESCAPE '\'`. */
export const escapeLike = (term: string) => term.replace(/[\\%_]/g, '\\$&');
