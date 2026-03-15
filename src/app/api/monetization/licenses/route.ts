import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createLicenseSchema } from "@/lib/validations/monetization"
import { logAudit } from "@/lib/security/audit"

/**
 * GET /api/monetization/licenses
 * Fetches all licenses for the authenticated creator, paginated.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"))
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20")))
    const offset = (page - 1) * limit

    // Get total count
    const { count } = await supabase
      .from("licenses")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creator.id)

    const total = count ?? 0

    // Fetch licenses
    const { data: licenses, error } = await supabase
      .from("licenses")
      .select("*")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[Licenses GET] Query error:", error)
      return NextResponse.json(
        { success: false, error: { code: "QUERY_ERROR", message: error.message } },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: licenses ?? [],
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    })
  } catch (error) {
    console.error("[Licenses GET] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/monetization/licenses
 * Creates a new license for an incident.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      )
    }

    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    // Parse and validate body
    const body = await request.json()
    const validation = createLicenseSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: validation.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      )
    }

    const {
      incidentId,
      priceCents,
      licenseType,
      expiresAt,
      licenseeEmail,
      licenseeName,
    } = validation.data

    // Verify the incident belongs to this creator
    const { data: incident } = await supabase
      .from("incidents")
      .select("id, creator_id, source_url, platform")
      .eq("id", incidentId)
      .eq("creator_id", creator.id)
      .single()

    if (!incident) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Incident not found or does not belong to you",
          },
        },
        { status: 404 }
      )
    }

    // Map the license type from the form schema to database schema
    const dbLicenseType =
      licenseType === "single_use"
        ? "limited"
        : licenseType === "time_limited"
          ? "non_exclusive"
          : "exclusive"

    // Create the license
    const now = new Date().toISOString()
    const { data: license, error: insertError } = await supabase
      .from("licenses")
      .insert({
        creator_id: creator.id,
        licensee_name: licenseeName || "Pending",
        licensee_email: licenseeEmail || "",
        license_type: dbLicenseType,
        scope: `License for use detected at ${incident.source_url}`,
        price_cents: priceCents,
        currency: "usd",
        status: "pending",
        asset_ids: [],
        starts_at: now,
        expires_at: expiresAt ?? null,
        terms: {
          incident_id: incidentId,
          original_license_type: licenseType,
          platform: incident.platform,
          source_url: incident.source_url,
        },
        created_at: now,
        updated_at: now,
      })
      .select()
      .single()

    if (insertError) {
      console.error("[Licenses POST] Insert error:", insertError)
      return NextResponse.json(
        { success: false, error: { code: "INSERT_ERROR", message: insertError.message } },
        { status: 500 }
      )
    }

    // Update the incident status to 'actioned' (licensed)
    await supabase
      .from("incidents")
      .update({
        status: "actioned",
        action_taken: "license",
        updated_at: now,
      })
      .eq("id", incidentId)

    // Audit log
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "monetization.license.create",
      resourceType: "license",
      resourceId: license.id,
      details: {
        incident_id: incidentId,
        price_cents: priceCents,
        license_type: licenseType,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json(
      { success: true, data: { license } },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Licenses POST] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}
