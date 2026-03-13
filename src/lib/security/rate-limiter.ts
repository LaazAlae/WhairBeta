/**
 * Simple in-memory sliding window rate limiter.
 * No external dependencies required (no Upstash, Redis, etc).
 *
 * Uses a Map to track request counts per key within a time window.
 * Includes automatic cleanup of expired entries to prevent memory leaks.
 */

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  success: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Unix timestamp (ms) when the rate limit window resets */
  reset: number;
}

/** In-memory store for rate limit entries */
const store = new Map<string, RateLimitEntry>();

/** Interval handle for cleanup task */
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

/** How often to run cleanup (every 60 seconds) */
const CLEANUP_INTERVAL_MS = 60_000;

/**
 * Cleans up expired entries from the store.
 * Called automatically on an interval.
 */
function cleanupExpiredEntries(maxWindowMs: number): void {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now - entry.windowStart > maxWindowMs) {
      store.delete(key);
    }
  }
}

/**
 * Ensures the cleanup interval is running.
 */
function ensureCleanup(windowMs: number): void {
  if (cleanupInterval === null) {
    cleanupInterval = setInterval(() => {
      cleanupExpiredEntries(windowMs);
    }, CLEANUP_INTERVAL_MS);

    // Allow the Node.js process to exit even if the interval is active
    if (cleanupInterval && typeof cleanupInterval === "object" && "unref" in cleanupInterval) {
      cleanupInterval.unref();
    }
  }
}

/**
 * Checks and updates the rate limit for a given key.
 *
 * @param key - Unique identifier for the rate limit bucket (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed within the window
 * @param windowMs - Duration of the rate limit window in milliseconds
 * @returns Object with success (allowed), remaining requests, and reset time
 *
 * @example
 * ```ts
 * const result = rateLimit("192.168.1.1", 100, 60_000);
 * if (!result.success) {
 *   return new Response("Too many requests", { status: 429 });
 * }
 * ```
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  ensureCleanup(windowMs);

  const now = Date.now();
  const entry = store.get(key);

  // No existing entry or window has expired — start a new window
  if (!entry || now - entry.windowStart >= windowMs) {
    const newEntry: RateLimitEntry = {
      count: 1,
      windowStart: now,
    };
    store.set(key, newEntry);

    return {
      success: true,
      remaining: limit - 1,
      reset: now + windowMs,
    };
  }

  // Within an active window — increment the count
  entry.count += 1;

  const reset = entry.windowStart + windowMs;
  const remaining = Math.max(0, limit - entry.count);

  if (entry.count > limit) {
    return {
      success: false,
      remaining: 0,
      reset,
    };
  }

  return {
    success: true,
    remaining,
    reset,
  };
}

/**
 * Resets the rate limit for a given key.
 * Useful for testing or manual intervention.
 */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/**
 * Clears all rate limit entries.
 * Useful for testing.
 */
export function clearAllRateLimits(): void {
  store.clear();
}
