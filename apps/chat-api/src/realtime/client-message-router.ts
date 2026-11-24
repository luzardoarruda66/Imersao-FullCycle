import { Injectable, Logger } from '@nestjs/common';

/** Quem trata uma mensagem do cliente: recebe a pessoa da conexão e o corpo, que ainda não foi validado. */
export type ClientMessageHandler = (personId: string, payload: unknown) => void | Promise<void>;

/**
 * As mensagens do cliente ao servidor (LLD, "Interfaces"): o gateway só as repassa a quem se registrou por tipo, e
 * o módulo dono da regra valida o corpo e decide. Uma falha de quem trata nunca derruba a conexão.
 */
@Injectable()
export class ClientMessageRouter {
  private readonly logger = new Logger(ClientMessageRouter.name);
  private readonly handlers = new Map<string, ClientMessageHandler>();

  register(type: string, handler: ClientMessageHandler) {
    this.handlers.set(type, handler);
  }

  types(): string[] {
    return [...this.handlers.keys()];
  }

  async handle(type: string, personId: string, payload: unknown) {
    try {
      await this.handlers.get(type)?.(personId, payload);
    } catch (error) {
      this.logger.warn(`Mensagem do cliente "${type}" não tratada: ${(error as Error).message}`);
    }
  }
}
