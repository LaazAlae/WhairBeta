import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, ValidationError } from "@/lib/utils/errors"
import { logAudit } from "@/lib/security/audit"
import { createLogger, generateOperationId } from "@/lib/utils/logger"
import { z } from "zod"

const log = createLogger("API.Whitelist")

const createWhitelistSchema = z.object({
  sourceType: z.enum(["url", "domain", "account", "platform"]),
  sourceValue: z.string().min(1, "Source value is required").max(500),
  label: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/whitelist
 * List all authorized sources (whitelist entries) for the creator.
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

    log.info("Fetching whitelist entries", { creatorId: creator.id }, opId)

    const { data: entries, error } = await supabase
      .from("authorized_sources")
      .select("*")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })

    if (error) {
      log.error("Failed to fetch whitelist", error, { creatorId: creator.id }, opId)
      throw error
    }

    log.info("Whitelist fetched", { count: entries?.length ?? 0 }, opId)
    return successResponse(entries ?? [])
  } catch (error) {
    log.error("GET /api/whitelist failed", error, undefined, opId)
    return errorResponse(error)
  }
}

/**
 * POST /api/whitelist
 * Add a new authorized source to the whitelist.
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
    const validated = createWhitelistSchema.parse(body)

    log.info("Adding whitelist entry", {
      creatorId: creator.id,
      sourceType: validated.sourceType,
      sourceValue: validated.sourceValue,
    }, opId)

    const admin = createAdminClient()
    const { data: entry, error } = await admin
      .from("authorized_sources")
      .insert({
        creator_id: creator.id,
        source_type: validated.sourceType,
        source_value: validated.sourceValue,
        label: validated.label ?? null,
        notes: validated.notes ?? null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      if (error.code === "23505") {
        throw new ValidationError("This source is already in your whitelist")
      }
      log.error("Failed to create whitelist entry", error, { creatorId: creator.id }, opId)
      throw error
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "whitelist.create",
      resourceType: "authorized_source",
      resourceId: entry?.id,
      details: {
        sourceType: validated.sourceType,
        sourceValue: validated.sourceValue,
      },
    })

    log.info("Whitelist entry created", { entryId: entry?.id }, opId)
    return successResponse(entry, 201)
  } catch (error) {
    log.error("POST /api/whitelist failed", error, undefined, opId)
    return errorResponse(error)
  }
}
