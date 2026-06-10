/**
 * Limiteur in-memory à fenêtre fixe. Sur Vercel serverless l'état est PAR
 * INSTANCE : c'est un amortisseur best-effort, PAS une mesure de sécurité —
 * la défense réelle contre l'énumération est l'entropie 256 bits des tokens.
 */

const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  key: string,
  limit = 10,
  windowMs = 60_000,
): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function resetRateLimits(): void {
  buckets.clear();
}
