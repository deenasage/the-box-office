// SPEC: auth.md
// Simple in-memory sliding window rate limiter (dev/single-instance only).
// For multi-instance deployments replace this with a Redis-backed store.
const attempts = new Map<string, { count: number; resetAt: number }>();

/**
 * Returns true if the request is allowed, false if it is rate-limited.
 * @param key        Arbitrary string key (e.g. "login:user@example.com")
 * @param maxAttempts Maximum number of attempts allowed within the window
 * @param windowMs   Sliding window length in milliseconds (default 60 s)
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 10,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const entry = attempts.get(key);

  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true; // allowed — first attempt in new window
  }

  if (entry.count >= maxAttempts) return false; // blocked

  entry.count++;
  return true;
}

/**
 * Clears the rate-limit counter for the given key (call on successful login).
 */
export function clearRateLimit(key: string): void {
  attempts.delete(key);
}
