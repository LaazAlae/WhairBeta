import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { paginatedResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, NotFoundError } from "@/lib/utils/errors"
import { PAGINATION } from "@/lib/utils/constants"
import { ENFORCEMENT_CASE_STATUSES } from "@/lib/validations/enforcement"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Auth check
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      throw new AuthError("Authentication required")
    }

    // Get creator profile
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      throw new NotFoundError("Creator profile not found")
    }

    // Parse query params
    const { searchParams } = new URL(request.url)
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? String(PAGINATION.DEFAULT_PAGE), 10)
    )
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(
        1,
        parseInt(searchParams.get("limit") ?? String(PAGINATION.DEFAULT_LIMIT), 10)
      )
    )
    const statusFilter = searchParams.get("status")

    // Build query
    let query = supabase
      .from("cases")
      .select("*, incidents(source_url, match_confidence)", {
        count: "exact",
      })
      .eq("creator_id", creator.id)

    // Apply status filter if valid
    if (
      statusFilter &&
      (ENFORCEMENT_CASE_STATUSES as readonly string[]).includes(statusFilter)
    ) {
      query = query.eq("status", statusFilter)
    }

    // Apply pagination and ordering
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: cases, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to)

    if (error) {
      throw new Error(`Failed to fetch cases: ${error.message}`)
    }

    // Flatten the joined incident data
    const flatCases = (cases ?? []).map((c: Record<string, unknown>) => {
      const incident = c.incidents as Record<string, unknown> | null
      return {
        ...c,
        incidents: undefined,
        source_url: incident?.source_url ?? null,
        match_confidence: incident?.match_confidence ?? null,
      }
    })

    return paginatedResponse(flatCases, count ?? 0, page, limit)
  } catch (error) {
    return errorResponse(error)
  }
}
