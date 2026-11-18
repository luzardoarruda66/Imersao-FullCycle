/** "15 minutos", "1 minuto": o tempo que falta para tentar entrar de novo, arredondado para cima. */
export function formatWait(seconds: number): string {
  const minutes = Math.max(1, Math.ceil(seconds / 60));
  return minutes === 1 ? "1 minuto" : `${minutes} minutos`;
}
