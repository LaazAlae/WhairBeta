import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, NotFoundError, ValidationError } from "@/lib/utils/errors"
import { logAudit } from "@/lib/security/audit"
import { createLogger, generateOperationId } from "@/lib/utils/logger"
import { z } from "zod"

const log = createLogger("API.Monitoring.Schedule")

const updateScheduleSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  targetValue: z.string().min(1).max(500).optional(),
  frequency: z.enum(["hourly", "daily", "weekly"]).optional(),
  isActive: z.boolean().optional(),
})

/**
 * GET /api/monitoring/schedules/[scheduleId]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const opId = generateOperationId()
  try {
    const { scheduleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found")

    const { data: schedule, error } = await supabase
      .from("monitoring_schedules")
      .select("*")
      .eq("id", scheduleId)
      .eq("creator_id", creator.id)
      .single()

    if (error || !schedule) {
      throw new NotFoundError("Monitoring schedule not found")
    }

    // Also fetch recent scans for this schedule
    const { data: recentScans } = await supabase
      .from("scans")
      .select("id, status, total_matches, created_at, completed_at")
      .eq("monitoring_schedule_id", scheduleId)
      .order("created_at", { ascending: false })
      .limit(10)

    log.info("Schedule fetched", { scheduleId }, opId)
    return successResponse({ schedule, recentScans: recentScans ?? [] })
  } catch (error) {
    log.error("GET schedule failed", error, undefined, opId)
    return errorResponse(error)
  }
}

/**
 * PATCH /api/monitoring/schedules/[scheduleId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const opId = generateOperationId()
  try {
    const { scheduleId } = await params
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
    const validated = updateScheduleSchema.parse(body)

    // Build update object
    const updates: Record<string, unknown> = {}
    if (validated.name !== undefined) updates.name = validated.name
    if (validated.targetValue !== undefined) updates.target_value = validated.targetValue
    if (validated.frequency !== undefined) updates.frequency = validated.frequency
    if (validated.isActive !== undefined) updates.is_active = validated.isActive

    if (Object.keys(updates).length === 0) {
      throw new ValidationError("No valid fields to update")
    }

    log.info("Updating schedule", { scheduleId, updates }, opId)

    const admin = createAdminClient()
    const { data: schedule, error } = await admin
      .from("monitoring_schedules")
      .update(updates)
      .eq("id", scheduleId)
      .eq("creator_id", creator.id)
      .select()
      .single()

    if (error || !schedule) {
      throw new NotFoundError("Schedule not found or update failed")
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "monitoring.update",
      resourceType: "monitoring_schedule",
      resourceId: scheduleId,
      details: updates,
    })

    log.info("Schedule updated", { scheduleId }, opId)
    return successResponse(schedule)
  } catch (error) {
    log.error("PATCH schedule failed", error, undefined, opId)
    return errorResponse(error)
  }
}

/**
 * DELETE /api/monitoring/schedules/[scheduleId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ scheduleId: string }> }
) {
  const opId = generateOperationId()
  try {
    const { scheduleId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found")

    log.info("Deleting schedule", { scheduleId }, opId)

    const admin = createAdminClient()
    const { error } = await admin
      .from("monitoring_schedules")
      .delete()
      .eq("id", scheduleId)
      .eq("creator_id", creator.id)

    if (error) {
      log.error("Failed to delete schedule", error, { scheduleId }, opId)
      throw new NotFoundError("Schedule not found or delete failed")
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "monitoring.delete",
      resourceType: "monitoring_schedule",
      resourceId: scheduleId,
    })

    log.info("Schedule deleted", { scheduleId }, opId)
    return successResponse({ deleted: true })
  } catch (error) {
    log.error("DELETE schedule failed", error, undefined, opId)
    return errorResponse(error)
  }
}
