import Stripe from "stripe"

/**
 * Singleton Stripe instance for server-side API calls.
 * Returns null if STRIPE_SECRET_KEY is not configured,
 * allowing the app to run gracefully without Stripe in development.
 */
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
      typescript: true,
    })
  : null

/**
 * Helper to assert Stripe is configured. Throws a clear error if not.
 */
export function requireStripe(): Stripe {
  if (!stripe) {
    throw new Error(
      "Stripe is not configured. Set the STRIPE_SECRET_KEY environment variable."
    )
  }
  return stripe
}
