import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, ValidationError } from "@/lib/utils/errors"
import { logAudit } from "@/lib/security/audit"
import { createLogger, generateOperationId } from "@/lib/utils/logger"
import { z } from "zod"

const log = createLogger("API.Monitoring.Schedules")

const createScheduleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  targetType: z.enum(["url", "platform", "keyword"]),
  targetValue: z.string().min(1, "Target value is required").max(500),
  frequency: z.enum(["hourly", "daily", "weekly"]).default("daily"),
})

/**
 * GET /api/monitoring/schedules
 * List all monitoring schedules for the authenticated creator.
 */
export async function GET() {
  const opId = generateOperationId()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) throw new AuthError("Creator profile not found")

    log.info("Fetching monitoring schedules", { creatorId: creator.id }, opId)

    const { data: schedules, error } = await supabase
      .from("monitoring_schedules")
      .select("*")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })

    if (error) {
      log.error("Failed to fetch schedules", error, { creatorId: creator.id }, opId)
      throw error
    }

    log.info("Schedules fetched", { count: schedules?.length ?? 0 }, opId)
    return successResponse(schedules ?? [])
  } catch (error) {
    log.error("GET /api/monitoring/schedules failed", error, undefined, opId)
    return errorResponse(error)
  }
}

/**
 * POST /api/monitoring/schedules
 * Create a new monitoring schedule.
 */
export async function POST(request: NextRequest) {
  const opId = generateOperationId()
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) throw new AuthError("Creator profile not found")

    const body = await request.json()
    const validated = createScheduleSchema.parse(body)

    log.info("Creating monitoring schedule", {
      creatorId: creator.id,
      name: validated.name,
      targetType: validated.targetType,
      frequency: validated.frequency,
    }, opId)

    // Calculate first run time
    const now = new Date()
    let nextRunAt: Date
    switch (validated.frequency) {
      case "hourly":
        nextRunAt = new Date(now.getTime() + 60 * 60 * 1000)
        break
      case "weekly":
        nextRunAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
        break
      default: // daily
        nextRunAt = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    }

    const admin = createAdminClient()
    const { data: schedule, error } = await admin
      .from("monitoring_schedules")
      .insert({
        creator_id: creator.id,
        name: validated.name,
        target_type: validated.targetType,
        target_value: validated.targetValue,
        frequency: validated.frequency,
        is_active: true,
        next_run_at: nextRunAt.toISOString(),
      })
      .select()
      .single()

    if (error || !schedule) {
      log.error("Failed to create schedule", error, { creatorId: creator.id }, opId)
      throw new ValidationError("Failed to create monitoring schedule")
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "monitoring.create",
      resourceType: "monitoring_schedule",
      resourceId: schedule.id,
      details: {
        name: validated.name,
        targetType: validated.targetType,
        targetValue: validated.targetValue,
        frequency: validated.frequency,
      },
    })

    log.info("Schedule created", { scheduleId: schedule.id }, opId)
    return successResponse(schedule, 201)
  } catch (error) {
    log.error("POST /api/monitoring/schedules failed", error, undefined, opId)
    return errorResponse(error)
  }
}
