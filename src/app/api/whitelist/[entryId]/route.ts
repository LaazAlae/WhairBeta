import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, NotFoundError } from "@/lib/utils/errors"
import { logAudit } from "@/lib/security/audit"
import { createLogger, generateOperationId } from "@/lib/utils/logger"
import { z } from "zod"

const log = createLogger("API.Whitelist.Entry")

const updateWhitelistSchema = z.object({
  label: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
})

/**
 * PATCH /api/whitelist/[entryId]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const opId = generateOperationId()
  try {
    const { entryId } = await params
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
    const validated = updateWhitelistSchema.parse(body)

    const updates: Record<string, unknown> = {}
    if (validated.label !== undefined) updates.label = validated.label
    if (validated.notes !== undefined) updates.notes = validated.notes
    if (validated.isActive !== undefined) updates.is_active = validated.isActive

    log.info("Updating whitelist entry", { entryId, updates }, opId)

    const admin = createAdminClient()
    const { data: entry, error } = await admin
      .from("authorized_sources")
      .update(updates)
      .eq("id", entryId)
      .eq("creator_id", creator.id)
      .select()
      .single()

    if (error || !entry) {
      throw new NotFoundError("Whitelist entry not found")
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "whitelist.update",
      resourceType: "authorized_source",
      resourceId: entryId,
      details: updates,
    })

    log.info("Whitelist entry updated", { entryId }, opId)
    return successResponse(entry)
  } catch (error) {
    log.error("PATCH whitelist entry failed", error, undefined, opId)
    return errorResponse(error)
  }
}

/**
 * DELETE /api/whitelist/[entryId]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const opId = generateOperationId()
  try {
    const { entryId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new AuthError()

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()
    if (!creator) throw new AuthError("Creator profile not found")

    log.info("Deleting whitelist entry", { entryId }, opId)

    const admin = createAdminClient()
    const { error } = await admin
      .from("authorized_sources")
      .delete()
      .eq("id", entryId)
      .eq("creator_id", creator.id)

    if (error) {
      throw new NotFoundError("Whitelist entry not found")
    }

    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "whitelist.delete",
      resourceType: "authorized_source",
      resourceId: entryId,
    })

    log.info("Whitelist entry deleted", { entryId }, opId)
    return successResponse({ deleted: true })
  } catch (error) {
    log.error("DELETE whitelist entry failed", error, undefined, opId)
    return errorResponse(error)
  }
}
