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
      return successResponse({ incidents: [], total: 0, page: 1 })
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams
    const statusFilter = searchParams.get("status")
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

    // Build query for total count
    let countQuery = supabase
      .from("incidents")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creator.id)

    if (statusFilter) {
      countQuery = countQuery.eq("status", statusFilter)
    }

    const { count: total } = await countQuery

    // Build query for data
    let dataQuery = supabase
      .from("incidents")
      .select("*")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (statusFilter) {
      dataQuery = dataQuery.eq("status", statusFilter)
    }

    const { data: incidents, error } = await dataQuery

    if (error) {
      console.error("[IncidentsAPI] Error fetching incidents:", error.message)
      return errorResponse(error)
    }

    return paginatedResponse(incidents ?? [], total ?? 0, page, limit)
  } catch (error) {
    console.error("[IncidentsAPI] Error:", error)
    return errorResponse(error)
  }
}
