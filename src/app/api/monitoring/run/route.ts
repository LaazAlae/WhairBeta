import { NextRequest } from "next/server"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { runDueSchedules } from "@/lib/monitoring/scheduler"
import { createLogger, generateOperationId } from "@/lib/utils/logger"

const log = createLogger("API.Monitoring.Run")

/**
 * POST /api/monitoring/run
 *
 * Cron endpoint — triggers all due monitoring schedules.
 * Protected by a bearer token (CRON_SECRET) to prevent unauthorized access.
 *
 * Vercel Cron config: add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/monitoring/run",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  const opId = generateOperationId()
  try {
    // Verify cron authorization
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET

    // In development, allow without auth. In production, require CRON_SECRET.
    if (process.env.NODE_ENV === "production" && cronSecret) {
      if (authHeader !== `Bearer ${cronSecret}`) {
        log.warn("Unauthorized cron attempt", {
          ip: request.headers.get("x-forwarded-for"),
        }, opId)
        return errorResponse(new Error("Unauthorized"))
      }
    }

    log.info("Cron trigger: running due monitoring schedules", undefined, opId)

    const results = await runDueSchedules()

    const summary = {
      schedulesRun: results.length,
      totalMatches: results.reduce((sum, r) => sum + r.matchesFound, 0),
      successes: results.filter((r) => r.status !== "failed").length,
      failures: results.filter((r) => r.status === "failed").length,
      results,
    }

    log.info("Cron run completed", {
      schedulesRun: summary.schedulesRun,
      totalMatches: summary.totalMatches,
      failures: summary.failures,
    }, opId)

    return successResponse(summary)
  } catch (error) {
    log.error("Cron run failed", error, undefined, opId)
    return errorResponse(error)
  }
}
