import { NextRequest, NextResponse } from "next/server"
import { rateLimit } from "@/lib/security/rate-limiter"
import { RATE_LIMITS } from "@/lib/utils/constants"

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  )
}

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request)

  // Rate limit: 5 attempts per minute per IP
  const rateLimitResult = rateLimit(
    `beta-gate:${clientIp}`,
    RATE_LIMITS.BETA_GATE.limit,
    RATE_LIMITS.BETA_GATE.windowMs
  )

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many attempts. Please try again later.",
        },
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
          ),
        },
      }
    )
  }

  const expectedPin = process.env.BETA_ACCESS_PIN
  if (!expectedPin) {
    return NextResponse.json({ success: true }, { status: 200 })
  }

  try {
    const body = await request.json()
    const { pin } = body

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "VALIDATION_ERROR", message: "PIN is required" },
        },
        { status: 400 }
      )
    }

    if (pin !== expectedPin) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_PIN", message: "Incorrect access PIN" },
        },
        { status: 401 }
      )
    }

    // PIN is correct — set cookie to the signing secret (middleware checks this)
    const signingSecret = process.env.WHAIR_SIGNING_SECRET
    if (!signingSecret) {
      console.error("[Beta Gate] WHAIR_SIGNING_SECRET is not set")
      return NextResponse.json(
        {
          success: false,
          error: { code: "INTERNAL_ERROR", message: "Server configuration error" },
        },
        { status: 500 }
      )
    }

    const response = NextResponse.json({ success: true }, { status: 200 })

    response.cookies.set("beta_access", signingSecret, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      },
      { status: 500 }
    )
  }
}
