import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { hashFileFromArrayBuffer } from "@/lib/verification/hasher"
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

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
]
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

    // Get existing creator profile
    const { data: creator } = await supabase
      .from("creators")
      .select("id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Creator profile not found. Please enroll first." },
        },
        { status: 404 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const files = formData.getAll("files") as File[]

    // Validate: at least 1 file
    if (files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "At least 1 file is required" },
        },
        { status: 400 }
      )
    }

    // Validate each file
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `${file.name}: Unsupported file type. Accepted: JPEG, PNG, WebP images and MP3, WAV, OGG, MP4, AAC, WebM audio.`,
            },
          },
          { status: 400 }
        )
      }
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `${file.name}: File exceeds 10MB limit`,
            },
          },
          { status: 400 }
        )
      }
    }

    const admin = createAdminClient()
    const createdAssets = []
    const fileErrors: string[] = []

    // Process each file
    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Hash the file
        const sha256Hash = await hashFileFromArrayBuffer(arrayBuffer)

        // Upload to Supabase Storage
        const fileId = crypto.randomUUID()
        const extension = file.name.split(".").pop() ?? "bin"
        const storagePath = `${creator.id}/${fileId}.${extension}`

        const { error: uploadError } = await admin.storage
          .from("assets")
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error(`[Assets POST] Storage upload failed for ${file.name}:`, uploadError.message)
          fileErrors.push(`${file.name}: storage upload failed — ${uploadError.message}`)
          continue
        }

        // Sign the hash
        const timestamp = new Date().toISOString()
        const payload = createProvenancePayload(sha256Hash, creator.id, timestamp)
        const { signature, keyId } = signData(payload)

        // Insert asset record
        const { data: asset, error: assetError } = await admin
          .from("assets")
          .insert({
            creator_id: creator.id,
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: storagePath,
            sha256_hash: sha256Hash,
            hmac_signature: signature,
            status: "active",
            created_at: timestamp,
          })
          .select()
          .single()

        if (assetError || !asset) {
          console.error(`[Assets POST] DB insert failed for ${file.name}:`, assetError?.message)
          fileErrors.push(`${file.name}: database insert failed — ${assetError?.message}`)
          continue
        }

        // Insert provenance record
        await admin.from("provenance_records").insert({
          asset_id: asset.id,
          creator_id: creator.id,
          action: "registration",
          sha256_hash: sha256Hash,
          hmac_signature: signature,
          signing_key_id: keyId,
          previous_record_id: null,
          metadata: {
            file_name: file.name,
            file_type: file.type,
            file_size: file.size,
          },
          created_at: timestamp,
        })

        createdAssets.push(asset)
      } catch (fileError) {
        console.error(`[Assets POST] Error processing ${file.name}:`, fileError)
        fileErrors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : "unknown error"}`)
      }
    }

    // If ALL files failed, return an error
    if (createdAssets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UPLOAD_FAILED",
            message: `All ${files.length} file(s) failed to process`,
            details: fileErrors,
          },
        },
        { status: 500 }
      )
    }

    // Log audit
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "asset.add",
      resourceType: "asset",
      resourceId: creator.id,
      details: {
        fileCount: createdAssets.length,
        totalFiles: files.length,
        fileNames: createdAssets.map((a) => a.file_name),
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          assets: createdAssets,
          ...(fileErrors.length > 0 && {
            warnings: fileErrors,
            message: `${createdAssets.length} of ${files.length} file(s) processed successfully`,
          }),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Assets POST] Error:", error)
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
