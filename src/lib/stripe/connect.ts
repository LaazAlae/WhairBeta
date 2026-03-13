import { requireStripe } from "./client"

/**
 * Creates a Stripe Connect Express account for a creator.
 * @param email - The creator's email address
 * @returns The Stripe account ID
 */
export async function createConnectAccount(email: string): Promise<string> {
  const stripe = requireStripe()

  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      platform: "whair",
    },
  })

  return account.id
}

/**
 * Creates an account link for Stripe Connect onboarding.
 * Redirects the creator to Stripe's hosted onboarding flow.
 * @param accountId - The Stripe Connect account ID
 * @param returnUrl - The URL to redirect to after onboarding completes
 * @returns The onboarding URL
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string
): Promise<string> {
  const stripe = requireStripe()

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${returnUrl}?setup=refresh`,
    return_url: `${returnUrl}?setup=complete`,
    type: "account_onboarding",
  })

  return accountLink.url
}

/**
 * Retrieves the status of a Stripe Connect account.
 * @param accountId - The Stripe Connect account ID
 * @returns Object with charges, payouts, and details submission status
 */
export async function getAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean
  payoutsEnabled: boolean
  detailsSubmitted: boolean
}> {
  const stripe = requireStripe()

  const account = await stripe.accounts.retrieve(accountId)

  return {
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
  }
}
