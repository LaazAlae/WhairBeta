import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { logAudit } from "@/lib/security/audit"
import { getProvenanceChain } from "@/lib/verification/provenance"

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

interface RouteContext {
  params: Promise<{ assetId: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { assetId } = await context.params
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
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    // Fetch asset - verify ownership
    const { data: asset, error: assetError } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .eq("creator_id", creator.id)
      .single()

    if (assetError || !asset) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Asset not found" } },
        { status: 404 }
      )
    }

    // Fetch provenance records
    const chain = await getProvenanceChain(assetId)

    return NextResponse.json(
      {
        success: true,
        data: {
          asset,
          provenanceChain: chain,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Asset Detail API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { assetId } = await context.params
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
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    // Fetch asset - verify ownership
    const { data: asset } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .eq("creator_id", creator.id)
      .single()

    if (!asset) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Asset not found" } },
        { status: 404 }
      )
    }

    const admin = createAdminClient()

    // Soft-delete: update status to 'deleted'
    const { error: updateError } = await admin
      .from("assets")
      .update({ status: "deleted" })
      .eq("id", assetId)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: { code: "DB_ERROR", message: "Failed to delete asset" } },
        { status: 500 }
      )
    }

    // Remove from storage
    if (asset.storage_path) {
      await admin.storage.from("assets").remove([asset.storage_path])
    }

    // Log audit
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "asset.delete",
      resourceType: "asset",
      resourceId: assetId,
      details: {
        fileName: asset.file_name,
        sha256Hash: asset.sha256_hash,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json(
      { success: true, data: { id: assetId, status: "deleted" } },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Asset Delete API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    )
  }
}
