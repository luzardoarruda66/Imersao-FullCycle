// Valores de regra (LLD, seção 9, "Valores e configuração").
export const SESSION_DURATION_DAYS = 30;
export const SESSION_DURATION = `${SESSION_DURATION_DAYS}d`;
export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_WAIT_MS = 15 * 60 * 1000;
export const LOGIN_IP_CEILING = 30;
export const LOGIN_IP_CEILING_WINDOW_MS = 15 * 60 * 1000;
export const SESSION_COOKIE_NAME = 'sid';

// Conversas (LLD, seção 9, "Valores e configuração").
export const CHANNEL_NAME_MAX = 80;
export const MESSAGE_TEXT_MAX = 4000;
export const MESSAGES_PER_READ = 50;
export const INVITE_MAX = 100;

// Tempo real (LLD, seção 9, "Valores e configuração").
export const RECONNECT_RETENTION_MS = 15 * 60 * 1000;
export const SESSION_CHECK_INTERVAL_MS = 2000;
// Prazo sem uso da sessão em ms, para a conferência das conexões abertas; derivado de `SESSION_DURATION`.
export const SESSION_IDLE_MS = SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

// Contas (LLD, seção 9, "Valores e configuração").
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PEOPLE_SEARCH_LIMIT = 20;
