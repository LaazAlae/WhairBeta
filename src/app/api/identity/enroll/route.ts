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

function generateUUID(): string {
  return crypto.randomUUID()
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

    // Parse multipart form data
    const formData = await request.formData()
    const displayName = formData.get("displayName") as string
    const files = formData.getAll("files") as File[]

    // Validate display name
    if (!displayName || displayName.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Display name must be at least 2 characters" },
        },
        { status: 400 }
      )
    }

    if (displayName.trim().length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Display name must be at most 100 characters" },
        },
        { status: 400 }
      )
    }

    // Validate files
    if (files.length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "At least 5 photos are required" },
        },
        { status: 400 }
      )
    }

    if (files.length > 10) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Maximum 10 photos allowed" },
        },
        { status: 400 }
      )
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    const maxSize = 10 * 1024 * 1024 // 10MB

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `${file.name}: Only JPEG, PNG, and WebP images are accepted`,
            },
          },
          { status: 400 }
        )
      }
      if (file.size > maxSize) {
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

    // Upsert creator record
    const { data: creator, error: creatorError } = await admin
      .from("creators")
      .upsert(
        {
          user_id: user.id,
          display_name: displayName.trim(),
          email: user.email,
          enrollment_completed: false,
          verification_status: "pending",
        },
        { onConflict: "user_id" }
      )
      .select()
      .single()

    if (creatorError || !creator) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "DB_ERROR", message: "Failed to create or update creator profile" },
        },
        { status: 500 }
      )
    }

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
        const fileId = generateUUID()
        const extension = file.name.split(".").pop() ?? "jpg"
        const storagePath = `${creator.id}/${fileId}.${extension}`

        const { error: uploadError } = await admin.storage
          .from("assets")
          .upload(storagePath, buffer, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error(`[Enroll] Storage upload failed for ${file.name}:`, uploadError.message)
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
          console.error(`[Enroll] DB insert failed for ${file.name}:`, assetError?.message)
          fileErrors.push(`${file.name}: database insert failed — ${assetError?.message}`)
          continue
        }

        // Insert provenance record (action: 'registration')
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
        console.error(`[Enroll] Error processing ${file.name}:`, fileError)
        fileErrors.push(`${file.name}: ${fileError instanceof Error ? fileError.message : "unknown error"}`)
      }
    }

    // If ALL files failed, return an error with details
    if (createdAssets.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ENROLLMENT_FAILED",
            message: `All ${files.length} files failed to process`,
            details: fileErrors,
          },
        },
        { status: 500 }
      )
    }

    // Update creator: enrollment_completed = true, verified
    await admin
      .from("creators")
      .update({
        enrollment_completed: true,
        verification_status: "verified",
      })
      .eq("id", creator.id)

    // Log audit
    await logAudit({
      userId: user.id,
      creatorId: creator.id,
      action: "identity.enroll",
      resourceType: "creator",
      resourceId: creator.id,
      details: {
        displayName: displayName.trim(),
        photoCount: createdAssets.length,
        totalFiles: files.length,
      },
      ip: request.headers.get("x-forwarded-for") ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
    })

    return NextResponse.json(
      {
        success: true,
        data: {
          creator: {
            id: creator.id,
            display_name: displayName.trim(),
            enrollment_completed: true,
          },
          assets: createdAssets,
          ...(fileErrors.length > 0 && {
            warnings: fileErrors,
            message: `${createdAssets.length} of ${files.length} files processed successfully`,
          }),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[Enroll API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            process.env.NODE_ENV === "development" && error instanceof Error
              ? error.message
              : "An unexpected error occurred during enrollment",
        },
      },
      { status: 500 }
    )
  }
}
