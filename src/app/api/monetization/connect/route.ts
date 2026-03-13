import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/stripe/client"
import { createConnectAccount, createAccountLink } from "@/lib/stripe/connect"
import { logAudit } from "@/lib/security/audit"

/**
 * GET /api/monetization/connect
 * Returns the creator's Stripe Connect status.
 */
export async function GET() {
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
      .select("id, stripe_account_id, stripe_onboarding_complete")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        stripe_account_id: creator.stripe_account_id,
        stripe_onboarding_complete: creator.stripe_onboarding_complete,
      },
    })
  } catch (error) {
    console.error("[Connect GET] Error:", error)
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Internal server error" } },
      { status: 500 }
    )
  }
}

/**
 * POST /api/monetization/connect
 * Initiates Stripe Connect onboarding.
 * Creates a new Express account if needed, then returns an onboarding URL.
 */
export async function POST(request: Request) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STRIPE_NOT_CONFIGURED",
            message:
              "Stripe is not configured. Contact your administrator to set up payment processing.",
          },
        },
        { status: 503 }
      )
    }

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
      .select("id, email, stripe_account_id")
      .eq("user_id", user.id)
      .single()

    if (!creator) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Creator profile not found" } },
        { status: 404 }
      )
    }

    let stripeAccountId = creator.stripe_account_id

    // Create a new Stripe Connect account if the creator doesn't have one
    if (!stripeAccountId) {
      stripeAccountId = await createConnectAccount(creator.email || user.email!)

      await supabase
        .from("creators")
        .update({
          stripe_account_id: stripeAccountId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", creator.id)

      await logAudit({
        userId: user.id,
        creatorId: creator.id,
        action: "monetization.connect.create",
        resourceType: "creator",
        resourceId: creator.id,
        details: { stripe_account_id: stripeAccountId },
        ip: request.headers.get("x-forwarded-for") ?? undefined,
        userAgent: request.headers.get("user-agent") ?? undefined,
      })
    }

    // Build the return URL
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000")
    const returnUrl = `${appUrl}/monetization/connect`

    // Create an account link for onboarding
    const url = await createAccountLink(stripeAccountId, returnUrl)

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error("[Connect POST] Error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message:
            error instanceof Error ? error.message : "Internal server error",
        },
      },
      { status: 500 }
    )
  }
}
