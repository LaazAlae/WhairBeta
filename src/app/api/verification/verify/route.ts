import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { hashFileFromArrayBuffer } from "@/lib/verification/hasher"
import { verifyFileProvenance } from "@/lib/verification/provenance"

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

    // Parse multipart form data (single file)
    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "No file provided" },
        },
        { status: 400 }
      )
    }

    // Compute SHA-256 hash of uploaded file
    const arrayBuffer = await file.arrayBuffer()
    const hash = await hashFileFromArrayBuffer(arrayBuffer)

    // Verify file provenance
    const result = await verifyFileProvenance(hash)

    return NextResponse.json(
      {
        success: true,
        data: {
          verified: result.verified,
          hash,
          message: result.message,
          creator: result.creator ?? null,
          chain: result.chain ?? null,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[Verify API] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            process.env.NODE_ENV === "development" && error instanceof Error
              ? error.message
              : "An unexpected error occurred during verification",
        },
      },
      { status: 500 }
    )
  }
}
