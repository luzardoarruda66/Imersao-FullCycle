import { PASSWORD, sidFrom, type TestApp } from './test-app.js';

/** Cria a conta, entra e devolve o cookie e o id da pessoa. */
export async function signUp(t: TestApp, email: string, name: string, ip = '10.0.0.1') {
  // O @usuário vem da parte local do e-mail (`ana@empresa.com` -> `ana`), que já cumpre o formato (LLD, "Valores e configuração").
  const person = await t.people.create({ email, username: email.split('@')[0]!, name, password: PASSWORD });
  const res = await t.http().post('/v1/sessoes').set('X-Forwarded-For', ip).send({ email, senha: PASSWORD });
  return { id: person.id, name, sid: sidFrom(res)! };
}

/** Chamadas HTTP com o cookie de uma pessoa. */
export function as(t: TestApp, sid: string | undefined) {
  const withCookie = <R extends { set: (name: string, value: string) => R }>(request: R) =>
    sid ? request.set('Cookie', sid) : request;
  return {
    get: (path: string) => withCookie(t.http().get(path)),
    post: (path: string, body?: unknown) => withCookie(t.http().post(path)).send(body as object),
  };
}
