/**
 * Monitoring scheduler — runs scheduled scans for creators.
 *
 * This module handles:
 * 1. Finding schedules that are due to run
 * 2. Executing the detection pipeline for each
 * 3. Updating schedule status and next-run time
 *
 * Triggered via: POST /api/monitoring/run (cron endpoint)
 * In production, this endpoint is called by Vercel Cron or external scheduler.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import { runDetectionPipeline } from "@/lib/detection/pipeline"
import { createLogger, generateOperationId } from "@/lib/utils/logger"

const log = createLogger("Monitoring.Scheduler")

export interface ScheduleRunResult {
  scheduleId: string
  scheduleName: string
  status: "success" | "failed" | "no_matches" | "matches_found"
  matchesFound: number
  error?: string
}

/**
 * Calculates the next run time based on frequency.
 */
function calculateNextRun(frequency: string): string {
  const now = new Date()
  switch (frequency) {
    case "hourly":
      now.setHours(now.getHours() + 1)
      break
    case "daily":
      now.setDate(now.getDate() + 1)
      break
    case "weekly":
      now.setDate(now.getDate() + 7)
      break
    default:
      now.setDate(now.getDate() + 1) // default to daily
  }
  return now.toISOString()
}

/**
 * Fetches all monitoring schedules that are due to run.
 * A schedule is "due" if:
 * - is_active = true
 * - next_run_at <= now (or next_run_at is null, meaning never run before)
 */
export async function getDueSchedules(): Promise<
  Array<{
    id: string
    creator_id: string
    name: string
    target_type: string
    target_value: string
    frequency: string
  }>
> {
  const supabase = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("monitoring_schedules")
    .select("id, creator_id, name, target_type, target_value, frequency")
    .eq("is_active", true)
    .or(`next_run_at.is.null,next_run_at.lte.${now}`)
    .order("next_run_at", { ascending: true })
    .limit(50) // process max 50 schedules per cron tick

  if (error) {
    log.error("Failed to fetch due schedules", error)
    return []
  }

  return data ?? []
}

/**
 * Runs a single monitoring schedule.
 *
 * Steps:
 * 1. Load creator's reference images
 * 2. Create a scan record (type: 'scheduled')
 * 3. Run the detection pipeline
 * 4. Update the schedule with results
 */
export async function runSchedule(
  schedule: {
    id: string
    creator_id: string
    name: string
    target_type: string
    target_value: string
    frequency: string
  }
): Promise<ScheduleRunResult> {
  const opId = generateOperationId()
  const supabase = createAdminClient()

  log.info(`Running schedule: ${schedule.name}`, {
    scheduleId: schedule.id,
    creatorId: schedule.creator_id,
    targetType: schedule.target_type,
    targetValue: schedule.target_value,
  }, opId)

  try {
    // Load creator's reference assets
    const { data: assets } = await supabase
      .from("assets")
      .select("id, storage_path")
      .eq("creator_id", schedule.creator_id)
      .eq("is_canonical", true)
      .eq("status", "active")

    if (!assets || assets.length === 0) {
      log.warn("Schedule skipped — no reference images", { scheduleId: schedule.id }, opId)
      await updateScheduleAfterRun(schedule.id, schedule.frequency, "failed", 0)
      return {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        status: "failed",
        matchesFound: 0,
        error: "No reference images enrolled",
      }
    }

    // Download reference buffers
    const referenceBuffers: Buffer[] = []
    for (const asset of assets) {
      try {
        const { data: blob } = await supabase.storage
          .from("assets")
          .download(asset.storage_path)
        if (blob) {
          const ab = await blob.arrayBuffer()
          referenceBuffers.push(Buffer.from(ab))
        }
      } catch (err) {
        log.warn(`Failed to download reference ${asset.id}`, { error: String(err) }, opId)
      }
    }

    if (referenceBuffers.length === 0) {
      log.warn("Schedule skipped — could not download any references", { scheduleId: schedule.id }, opId)
      await updateScheduleAfterRun(schedule.id, schedule.frequency, "failed", 0)
      return {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        status: "failed",
        matchesFound: 0,
        error: "Could not download reference images",
      }
    }

    // Create a scan record
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .insert({
        creator_id: schedule.creator_id,
        scan_type: "scheduled",
        target_url: schedule.target_type === "url" ? schedule.target_value : null,
        status: "pending",
        monitoring_schedule_id: schedule.id,
        total_images_found: 0,
        total_faces_detected: 0,
        total_matches: 0,
        metadata: {
          schedule_name: schedule.name,
          target_type: schedule.target_type,
          target_value: schedule.target_value,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (scanError || !scan) {
      log.error("Failed to create scheduled scan record", scanError, { scheduleId: schedule.id }, opId)
      await updateScheduleAfterRun(schedule.id, schedule.frequency, "failed", 0)
      return {
        scheduleId: schedule.id,
        scheduleName: schedule.name,
        status: "failed",
        matchesFound: 0,
        error: "Failed to create scan record",
      }
    }

    // Run the detection pipeline
    let targetUrl = schedule.target_value
    if (schedule.target_type === "keyword") {
      // For keyword-based schedules, we construct a Google Images search URL
      // The pipeline will extract images from the search results page
      targetUrl = `https://www.google.com/search?q=${encodeURIComponent(schedule.target_value)}&tbm=isch`
    }

    const result = await runDetectionPipeline({
      scanId: scan.id,
      creatorId: schedule.creator_id,
      scanType: "url",
      targetUrl,
      referenceBuffers,
    })

    const status = result.matches > 0 ? "matches_found" : "no_matches"
    await updateScheduleAfterRun(schedule.id, schedule.frequency, status, result.matches)

    log.info(`Schedule completed: ${schedule.name}`, {
      scheduleId: schedule.id,
      matches: result.matches,
      imagesFound: result.imagesFound,
      facesDetected: result.facesDetected,
    }, opId)

    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      status: result.matches > 0 ? "matches_found" : "success",
      matchesFound: result.matches,
    }
  } catch (error) {
    log.error(`Schedule failed: ${schedule.name}`, error, { scheduleId: schedule.id }, opId)
    await updateScheduleAfterRun(schedule.id, schedule.frequency, "failed", 0)
    return {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      status: "failed",
      matchesFound: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * Updates the schedule record after a run.
 */
async function updateScheduleAfterRun(
  scheduleId: string,
  frequency: string,
  status: string,
  matchesFound: number
): Promise<void> {
  const supabase = createAdminClient()
  const nextRunAt = calculateNextRun(frequency)

  const { error } = await supabase
    .from("monitoring_schedules")
    .update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt,
      last_run_status: status,
      last_run_matches: matchesFound,
      total_runs: undefined, // will use raw SQL increment below
    })
    .eq("id", scheduleId)

  if (error) {
    log.error("Failed to update schedule after run", error, { scheduleId })
  }

  // Increment counters via RPC or direct update
  await supabase.rpc("increment_monitoring_counters", {
    p_schedule_id: scheduleId,
    p_matches: matchesFound,
  }).then(({ error: rpcError }) => {
    if (rpcError) {
      // Fallback: just log, don't fail
      log.warn("RPC increment_monitoring_counters not found, counters not incremented", {
        scheduleId,
        error: rpcError.message,
      })
    }
  })
}

/**
 * Runs all due monitoring schedules.
 * Called by the cron endpoint: POST /api/monitoring/run
 */
export async function runDueSchedules(): Promise<ScheduleRunResult[]> {
  const opId = generateOperationId()
  log.info("Checking for due monitoring schedules...", undefined, opId)

  const schedules = await getDueSchedules()

  if (schedules.length === 0) {
    log.info("No schedules due to run", undefined, opId)
    return []
  }

  log.info(`Found ${schedules.length} schedule(s) to run`, undefined, opId)

  const results: ScheduleRunResult[] = []

  // Run sequentially to avoid overwhelming external APIs
  for (const schedule of schedules) {
    const result = await runSchedule(schedule)
    results.push(result)
  }

  const totalMatches = results.reduce((sum, r) => sum + r.matchesFound, 0)
  const failures = results.filter((r) => r.status === "failed").length

  log.info("Monitoring run completed", {
    schedulesRun: results.length,
    totalMatches,
    failures,
  }, opId)

  return results
}
