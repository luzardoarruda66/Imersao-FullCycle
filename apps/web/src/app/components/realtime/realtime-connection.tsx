"use client";

import { useEffect } from "react";
import { getRealtimeClient } from "@/lib/realtime/realtime";

/** Abre a conexão em tempo real da aba enquanto a casca da área logada está montada. Não desenha nada. */
export function RealtimeConnection() {
  useEffect(() => {
    const client = getRealtimeClient();
    client.start();
    return () => client.stop();
  }, []);
  return null;
}
