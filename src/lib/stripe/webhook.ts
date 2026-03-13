import type Stripe from "stripe"
import { requireStripe } from "./client"

/**
 * Verifies a Stripe webhook signature and constructs the event.
 * @param body - The raw request body as a string (NOT parsed JSON)
 * @param signature - The Stripe-Signature header value
 * @returns The verified Stripe event
 * @throws Error if the signature is invalid or webhook secret is not set
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): Stripe.Event {
  const stripe = requireStripe()

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    throw new Error(
      "Stripe webhook secret is not configured. Set the STRIPE_WEBHOOK_SECRET environment variable."
    )
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret)
}
