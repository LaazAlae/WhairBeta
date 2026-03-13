import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try {
              cookieStore.set(name, value, options)
            } catch {}
          })
        },
      },
    }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "AUTH_ERROR", message: "Authentication required" } },
        { status: 401 }
      )
    }

    // Get creator profile
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: true, data: [], pagination: { total: 0, page: 1, limit: 50, totalPages: 0, hasNext: false, hasPrevious: false } },
        { status: 200 }
      )
    }

    // Parse pagination params
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)))
    const offset = (page - 1) * limit

    // Count total records
    const { count: total } = await supabase
      .from("provenance_records")
      .select("*", { count: "exact", head: true })
      .eq("creator_id", creator.id)

    // Fetch paginated records
    const { data: records, error } = await supabase
      .from("provenance_records")
      .select(`
        id,
        asset_id,
        action,
        sha256_hash,
        hmac_signature,
        signing_key_id,
        created_at,
        metadata,
        assets (
          file_name,
          file_type
        )
      `)
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: "Failed to fetch history" } },
        { status: 500 }
      )
    }

    const totalCount = total ?? 0
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json(
      {
        success: true,
        data: records ?? [],
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[History API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    )
  }
}
