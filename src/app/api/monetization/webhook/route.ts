import { NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/stripe/webhook"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

/**
 * POST /api/monetization/webhook
 * Handles Stripe webhook events. Raw body for signature verification.
 */
export async function POST(request: Request) {
  try {
    // Read the raw body — do NOT parse as JSON
    const body = await request.text()
    const signature = request.headers.get("stripe-signature")

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      )
    }

    // Verify the webhook signature
    let event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (err) {
      console.error(
        "[Webhook] Signature verification failed:",
        err instanceof Error ? err.message : err
      )
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    switch (event.type) {
      /**
       * Stripe Connect account updated — check onboarding status.
       */
      case "account.updated": {
        const account = event.data.object as {
          id: string
          charges_enabled: boolean
          payouts_enabled: boolean
          details_submitted: boolean
        }

        const onboardingComplete =
          account.charges_enabled &&
          account.payouts_enabled &&
          account.details_submitted

        const { error } = await supabase
          .from("creators")
          .update({
            stripe_onboarding_complete: onboardingComplete,
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_account_id", account.id)

        if (error) {
          console.error("[Webhook] Failed to update creator onboarding:", error)
        }

        console.log(
          `[Webhook] account.updated: ${account.id} onboarding=${onboardingComplete}`
        )
        break
      }

      /**
       * Checkout session completed — activate the license.
       */
      case "checkout.session.completed": {
        const session = event.data.object as {
          id: string
          payment_intent: string
          metadata?: { license_id?: string }
        }

        const licenseId = session.metadata?.license_id
        if (licenseId) {
          const now = new Date().toISOString()
          const { error } = await supabase
            .from("licenses")
            .update({
              status: "active",
              stripe_payment_intent_id: session.payment_intent,
              updated_at: now,
            })
            .eq("id", licenseId)

          if (error) {
            console.error("[Webhook] Failed to activate license:", error)
          }

          console.log(`[Webhook] checkout.session.completed: license=${licenseId}`)
        }
        break
      }

      /**
       * Payment intent succeeded — log for records.
       */
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as {
          id: string
          amount: number
          metadata?: { license_id?: string }
        }

        console.log(
          `[Webhook] payment_intent.succeeded: ${paymentIntent.id} amount=${paymentIntent.amount}`
        )

        // Update license if linked
        const licenseId = paymentIntent.metadata?.license_id
        if (licenseId) {
          await supabase
            .from("licenses")
            .update({
              stripe_payment_intent_id: paymentIntent.id,
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("id", licenseId)
        }
        break
      }

      default:
        console.log(`[Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("[Webhook] Error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}
