import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  successResponse,
  errorResponse,
  paginatedResponse,
} from "@/lib/utils/api-response"
import { AuthError } from "@/lib/utils/errors"
import { PAGINATION } from "@/lib/utils/constants"

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

    // Get creator record
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return successResponse({ scans: [], total: 0, page: 1 })
    }

    // Parse pagination params
    const searchParams = request.nextUrl.searchParams
    const page = Math.max(
      1,
      parseInt(searchParams.get("page") ?? String(PAGINATION.DEFAULT_PAGE), 10)
    )
    const limit = Math.min(
      PAGINATION.MAX_LIMIT,
      Math.max(
        1,
        parseInt(
          searchParams.get("limit") ?? String(PAGINATION.DEFAULT_LIMIT),
          10
        )
      )
    )
    const offset = (page - 1) * limit

    // Fetch total count
    const { count: total } = await supabase
      .from("scans")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creator.id)

    // Fetch scans with pagination
    const { data: scans, error } = await supabase
      .from("scans")
      .select(
        "id, scan_type, target_url, status, total_images_found, total_faces_detected, total_matches, error_message, started_at, completed_at, created_at"
      )
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[ResultsAPI] Error fetching scans:", error.message)
      return errorResponse(error)
    }

    return paginatedResponse(scans ?? [], total ?? 0, page, limit)
  } catch (error) {
    console.error("[ResultsAPI] Error:", error)
    return errorResponse(error)
  }
}
