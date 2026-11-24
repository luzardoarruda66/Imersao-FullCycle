// Valores de regra (LLD, seção 9, "Valores e configuração").
export const SESSION_DURATION_DAYS = 30;
export const SESSION_DURATION = `${SESSION_DURATION_DAYS}d`;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WAIT_MS = 15 * 60 * 1000;
export const LOGIN_IP_CEILING = 30;
export const LOGIN_IP_CEILING_WINDOW_MS = 15 * 60 * 1000;
export const SESSION_COOKIE_NAME = 'sid';

// Tempo real (LLD, seção 9, "Valores e configuração").
export const RECONNECT_RETENTION_MS = 15 * 60 * 1000;
export const SESSION_CHECK_INTERVAL_MS = 2000;
// Prazo sem uso da sessão em ms, para a conferência das conexões abertas; derivado de `SESSION_DURATION`.
export const SESSION_IDLE_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;
