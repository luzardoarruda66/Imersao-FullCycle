"use client";

import { io } from "socket.io-client";
import { RealtimeClient } from "./realtime-client";

/** A conexão da aba, criada sob demanda no navegador; o valor de `NEXT_PUBLIC_*` é congelado no build (`.claude/rules/nextjs.md`). */
let client: RealtimeClient | undefined;

export function getRealtimeClient(): RealtimeClient {
  client ??= new RealtimeClient({
    url: process.env.NEXT_PUBLIC_CHAT_WS_URL ?? "",
    createSocket: (url, options) => io(url, { transports: ["websocket"], withCredentials: true, auth: options.auth }),
    reload: () => window.location.reload(),
  });
  return client;
}
