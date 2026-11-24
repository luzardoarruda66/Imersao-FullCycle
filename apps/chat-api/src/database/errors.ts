/** Violação de índice único do Postgres (`23505`), vista pelo erro do TypeORM ou do driver. */
export function isUniqueViolation(error: unknown): boolean {
  const e = error as { code?: string; driverError?: { code?: string } } | null;
  return e?.driverError?.code === '23505' || e?.code === '23505';
}
