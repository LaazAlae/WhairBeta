import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashFile } from "@/lib/verification/hasher"
import { signData, createProvenancePayload } from "@/lib/verification/signer"
import { logAudit } from "@/lib/security/audit"

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

export async function POST(request: NextRequest) {
  try {
    // Auth check
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

    // Parse body
    const body = await request.json()
    const { assetId } = body

    if (!assetId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Asset ID is required" } },
        { status: 400 }
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

    // Verify asset belongs to creator
    const { data: asset } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .eq("creator_id", creator.id)
      .neq("status", "deleted")
      .single()

    if (!asset) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Asset not found or does not belong to you" } },
        { status: 404 }
      )
    }

    const admin = createAdminClient()

    // Fetch file from Supabase Storage
    const { data: fileData, error: downloadError } = await admin.storage
      .from("assets")
      .download(asset.storage_path)

    if (downloadError || !fileData) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "STORAGE_ERROR", message: "Failed to fetch file from storage" },
        },
        { status: 500 }
      )
    }

    // Compute SHA-256 hash
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const sha256Hash = await hashFile(buffer)

    // Sign with HMAC
    const timestamp = new Date().toISOString()
    const payload = createProvenancePayload(sha256Hash, creator.id, timestamp)
    const { signature, keyId, signedAt } = signData(payload)

    // Get the last provenance record to link the chain
    const { data: lastRecord } = await admin
      .from("provenance_records")
      .select("id")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    // Insert provenance_record (action: 'signing')
    const { data: provenanceRecord, error: provError } = await admin
      .from("provenance_records")
      .insert({
        asset_id: assetId,
        creator_id: creator.id,
        action: "signing",
        sha256_hash: sha256Hash,
        hmac_signature: signature,
        signing_key_id: keyId,
        previous_record_id: lastRecord?.id ?? null,
        metadata: {
          signed_at: signedAt,
          file_name: asset.file_name,
        },
        created_at: timestamp,
      })
      .select()
      .single()

    if (provError) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DB_ERROR", message: "Failed to create provenance record" },
        },
        { status: 500 }
      )
    }

    // Update asset hmac_signature
    await admin
      .from("assets")
      .update({
        hmac_signature: signature,
        status: "active",
      })
      .eq("id", assetId)

    // Log audit
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "asset.sign",
      resourceType: "asset",
      resourceId: assetId,
      details: {
        sha256Hash,
        signedAt,
        keyId,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          provenanceRecord,
          hash: sha256Hash,
          signature,
          signedAt,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Sign API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            process.env.NODE_ENV === "development" && error instanceof Error
              ? error.message
              : "An unexpected error occurred during signing",
        },
      },
      { status: 500 }
    )
  }
}
