/**
 * Structured logger for Whair platform.
 *
 * Every log entry includes:
 * - ISO timestamp
 * - Log level (DEBUG, INFO, WARN, ERROR)
 * - Module name (where the log originated)
 * - Operation ID (for tracing a request across multiple functions)
 * - Structured data payload
 *
 * In production, only INFO+ is logged. In development, DEBUG+ is logged.
 * All ERROR logs include full stack traces.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

interface LogEntry {
  timestamp: string
  level: LogLevel
  module: string
  operationId?: string
  message: string
  data?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
  durationMs?: number
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
}

function getMinLevel(): LogLevel {
  return process.env.NODE_ENV === "production" ? "INFO" : "DEBUG"
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getMinLevel()]
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    `[${entry.module}]`,
  ]

  if (entry.operationId) {
    parts.push(`[op:${entry.operationId.slice(0, 8)}]`)
  }

  parts.push(entry.message)

  if (entry.durationMs !== undefined) {
    parts.push(`(${entry.durationMs}ms)`)
  }

  return parts.join(" ")
}

function emit(entry: LogEntry): void {
  if (!shouldLog(entry.level)) return

  const formatted = formatEntry(entry)

  switch (entry.level) {
    case "ERROR":
      if (entry.data || entry.error) {
        console.error(formatted, {
          ...(entry.data && { data: entry.data }),
          ...(entry.error && { error: entry.error }),
        })
      } else {
        console.error(formatted)
      }
      break
    case "WARN":
      if (entry.data) {
        console.warn(formatted, { data: entry.data })
      } else {
        console.warn(formatted)
      }
      break
    case "DEBUG":
      if (entry.data) {
        console.debug(formatted, { data: entry.data })
      } else {
        console.debug(formatted)
      }
      break
    default:
      if (entry.data) {
        console.log(formatted, { data: entry.data })
      } else {
        console.log(formatted)
      }
  }
}

/**
 * Creates a logger scoped to a specific module.
 *
 * Usage:
 * ```ts
 * const log = createLogger("Detection.Pipeline")
 * log.info("Starting scan", { scanId, creatorId })
 * log.error("Scan failed", error, { scanId })
 * ```
 */
export function createLogger(module: string) {
  return {
    debug(message: string, data?: Record<string, unknown>, operationId?: string) {
      emit({
        timestamp: new Date().toISOString(),
        level: "DEBUG",
        module,
        operationId,
        message,
        data,
      })
    },

    info(message: string, data?: Record<string, unknown>, operationId?: string) {
      emit({
        timestamp: new Date().toISOString(),
        level: "INFO",
        module,
        operationId,
        message,
        data,
      })
    },

    warn(message: string, data?: Record<string, unknown>, operationId?: string) {
      emit({
        timestamp: new Date().toISOString(),
        level: "WARN",
        module,
        operationId,
        message,
        data,
      })
    },

    error(
      message: string,
      error?: unknown,
      data?: Record<string, unknown>,
      operationId?: string
    ) {
      const errorInfo =
        error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error
            ? { name: "UnknownError", message: String(error) }
            : undefined

      emit({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        module,
        operationId,
        message,
        data,
        error: errorInfo,
      })
    },

    /**
     * Wraps an async operation with timing and error logging.
     * Returns the result if successful, throws on error after logging.
     */
    async timed<T>(
      operation: string,
      fn: () => Promise<T>,
      data?: Record<string, unknown>,
      operationId?: string
    ): Promise<T> {
      const start = Date.now()
      emit({
        timestamp: new Date().toISOString(),
        level: "DEBUG",
        module,
        operationId,
        message: `${operation} — started`,
        data,
      })

      try {
        const result = await fn()
        const durationMs = Date.now() - start
        emit({
          timestamp: new Date().toISOString(),
          level: "INFO",
          module,
          operationId,
          message: `${operation} — completed`,
          data,
          durationMs,
        })
        return result
      } catch (err) {
        const durationMs = Date.now() - start
        const errorInfo =
          err instanceof Error
            ? { name: err.name, message: err.message, stack: err.stack }
            : { name: "UnknownError", message: String(err) }

        emit({
          timestamp: new Date().toISOString(),
          level: "ERROR",
          module,
          operationId,
          message: `${operation} — failed`,
          data,
          error: errorInfo,
          durationMs,
        })
        throw err
      }
    },
  }
}

/**
 * Generates a short operation ID for request tracing.
 */
export function generateOperationId(): string {
  return crypto.randomUUID()
}
