import type { INestApplicationContext } from '@nestjs/common';
import { SessionService } from '@nestjs/authentication';
import { emailSchema } from '../auth/auth.schemas.js';
import { generatePassword } from '../accounts/password-rule.js';
import { EmailAlreadyRegisteredError, PeopleService, UsernameAlreadyTakenError } from '../accounts/people.service.js';
import { parseUsername } from '../accounts/username-rule.js';

export interface CommandResult {
  code: number;
  out: string;
  err: string;
}

const USAGE = `Uso: pnpm contas <subcomando>

  criar <email> <usuario> <nome>     Cria a conta e mostra a senha gerada, uma vez só
  definir-usuario <email> <usuario>  Troca o @usuário da conta
  redefinir-senha <email>            Gera uma senha nova, mostra uma vez e encerra as sessões
  encerrar-sessoes <email>           Encerra todas as sessões da pessoa
  dar-admin <email>                  Dá o papel de administrador
  tirar-admin <email>                Tira o papel de administrador
  dar-permissao-dados <email>        Dá a permissão de dados
  tirar-permissao-dados <email>      Tira a permissão de dados`;

/** Comando de contas da operação (LLD, 6.2, "Operação"). Devolve o resultado; quem chama imprime e sai. */
export async function runContas(argv: string[], app: INestApplicationContext): Promise<CommandResult> {
  const people = app.get(PeopleService);
  const sessions = app.get(SessionService);
  const [subcommand, email, ...rest] = argv;
  const ok = (out: string): CommandResult => ({ code: 0, out, err: '' });
  const fail = (err: string): CommandResult => ({ code: 1, out: '', err });

  const needsPerson = async () => {
    if (!email) return null;
    return people.findByEmail(email);
  };

  switch (subcommand) {
    case 'criar': {
      const [rawUsername, ...nameParts] = rest;
      const name = nameParts.join(' ').trim();
      if (!email || !rawUsername || !name) return fail('Informe o e-mail, o @usuário e o nome: criar <email> <usuario> <nome>');
      if (!emailSchema.safeParse(email).success) return fail(`E-mail inválido: ${email}`);
      const parsed = parseUsername(rawUsername);
      if ('error' in parsed) return fail(parsed.error);
      const { username } = parsed;
      const password = generatePassword();
      try {
        const person = await people.create({ email, username, name, password });
        return ok(`Conta criada: ${person.email}\nUsuário: @${person.username}\nSenha (mostrada uma vez só): ${password}`);
      } catch (error) {
        if (error instanceof EmailAlreadyRegisteredError) return fail(`Já existe uma conta com o e-mail ${normalized(email)}.`);
        if (error instanceof UsernameAlreadyTakenError) return fail(usernameTaken(username));
        throw error;
      }
    }
    case 'definir-usuario': {
      const [rawUsername] = rest;
      if (!email || !rawUsername) return fail('Informe o e-mail e o @usuário: definir-usuario <email> <usuario>');
      const person = await needsPerson();
      if (!person) return fail(noAccount(email));
      const parsed = parseUsername(rawUsername);
      if ('error' in parsed) return fail(parsed.error);
      const { username } = parsed;
      try {
        await people.setUsername(person.id, username);
      } catch (error) {
        if (error instanceof UsernameAlreadyTakenError) return fail(usernameTaken(username));
        throw error;
      }
      return ok(`${person.email}: o @usuário agora é @${username}.`);
    }
    case 'redefinir-senha': {
      const person = await needsPerson();
      if (!person) return fail(noAccount(email));
      const password = generatePassword();
      await people.setPassword(person.id, password);
      await sessions.revokeAll(person.id);
      return ok(`Senha redefinida: ${person.email}\nSenha (mostrada uma vez só): ${password}\nTodas as sessões da pessoa foram encerradas.`);
    }
    case 'encerrar-sessoes': {
      const person = await needsPerson();
      if (!person) return fail(noAccount(email));
      await sessions.revokeAll(person.id);
      return ok(`Sessões encerradas: ${person.email}`);
    }
    case 'dar-admin':
    case 'tirar-admin':
    case 'dar-permissao-dados':
    case 'tirar-permissao-dados': {
      const person = await needsPerson();
      if (!person) return fail(noAccount(email));
      const grant = subcommand.startsWith('dar-');
      const flag = subcommand.endsWith('admin') ? 'isAdmin' : 'hasDataPermission';
      await people.setFlags(person.id, { [flag]: grant });
      return ok(`${person.email}: ${subcommand.replaceAll('-', ' ')} feito.`);
    }
    default:
      return { code: 1, out: '', err: USAGE };
  }
}

const usernameTaken = (username: string) => `O @${username} já está em uso.`;
const normalized = (email: string) => email.trim().toLowerCase();
const noAccount = (email: string | undefined) =>
  email ? `Não existe conta com o e-mail ${normalized(email)}.` : 'Informe o e-mail da conta.';
