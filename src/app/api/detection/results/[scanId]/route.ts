import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { AuthError, NotFoundError } from "@/lib/utils/errors"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params
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
      throw new NotFoundError("Creator profile not found")
    }

    // Fetch scan with ownership check
    const { data: scan, error: scanError } = await supabase
      .from("scans")
      .select("*")
      .eq("id", scanId)
      .eq("creator_id", creator.id)
      .single()

    if (scanError || !scan) {
      throw new NotFoundError("Scan not found")
    }

    // Fetch related incidents
    const { data: incidents } = await supabase
      .from("incidents")
      .select("*")
      .eq("scan_id", scanId)
      .eq("creator_id", creator.id)
      .order("match_confidence", { ascending: false })

    return successResponse({ scan, incidents: incidents ?? [] })
  } catch (error) {
    console.error("[ScanDetailAPI] Error:", error)
    return errorResponse(error)
  }
}
