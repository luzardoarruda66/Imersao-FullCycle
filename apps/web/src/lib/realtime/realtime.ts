"use client";

import { io } from "socket.io-client";
import { RealtimeClient } from "./realtime-client";

/** A conexão da aba, criada sob demanda no navegador. O valor de `NEXT_PUBLIC_*` é congelado no build (`.claude/rules/nextjs.md`) e lido por nome literal. */
let client: RealtimeClient | undefined;

export function getRealtimeClient(): RealtimeClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_CHAT_WS_URL;
    // Sem a variável, o socket conectaria na própria origem e falharia sem explicação.
    if (!url) throw new Error("Variável de ambiente ausente: NEXT_PUBLIC_CHAT_WS_URL");
    client = new RealtimeClient({
      url,
      createSocket: (target, options) => io(target, { transports: ["websocket"], withCredentials: true, auth: options.auth }),
      reload: () => window.location.reload(),
    });
  }
  return client;
}
