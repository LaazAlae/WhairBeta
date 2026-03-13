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
        { success: true, data: [] },
        { status: 200 }
      )
    }

    // Fetch all assets
    const { data: assets, error } = await supabase
      .from("assets")
      .select("*")
      .eq("creator_id", creator.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: "Failed to fetch assets" } },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: true, data: assets ?? [] },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Assets API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
        },
      },
      { status: 500 }
    )
  }
}
