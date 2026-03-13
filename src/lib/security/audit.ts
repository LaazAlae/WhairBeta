import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Parameters for creating an audit log entry.
 */
export interface AuditLogParams {
  /** The authenticated user's ID (from auth.users) */
  userId: string;
  /** The associated creator profile ID, if applicable */
  creatorId?: string;
  /** The action performed, e.g. 'identity.enroll', 'scan.initiate' */
  action: string;
  /** The type of resource affected, e.g. 'creator', 'asset', 'incident' */
  resourceType: string;
  /** The ID of the affected resource, if applicable */
  resourceId?: string;
  /** Additional details about the action */
  details?: Record<string, unknown>;
  /** The IP address of the request */
  ip?: string;
  /** The User-Agent header of the request */
  userAgent?: string;
}

/**
 * Inserts an audit log entry into the audit_log table.
 * Uses the admin (service role) client to bypass RLS,
 * ensuring audit logs can always be written regardless
 * of the user's permissions.
 *
 * This function does not throw on failure — audit logging
 * should never break the main request flow. Errors are
 * logged to console.error instead.
 *
 * @param params - The audit log entry parameters
 *
 * @example
 * ```ts
 * await logAudit({
 *   userId: user.id,
 *   creatorId: creator.id,
 *   action: "identity.enroll",
 *   resourceType: "creator",
 *   resourceId: creator.id,
 *   details: { photoCount: 10 },
 *   ip: request.headers.get("x-forwarded-for"),
 *   userAgent: request.headers.get("user-agent"),
 * });
 * ```
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase.from("audit_log").insert({
      user_id: params.userId,
      creator_id: params.creatorId ?? null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId ?? null,
      details: params.details ?? null,
      ip_address: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    });

    if (error) {
      console.error("[Audit] Failed to write audit log:", error.message, {
        action: params.action,
        resourceType: params.resourceType,
        userId: params.userId,
      });
    }
  } catch (err) {
    console.error(
      "[Audit] Unexpected error writing audit log:",
      err instanceof Error ? err.message : err,
      {
        action: params.action,
        resourceType: params.resourceType,
        userId: params.userId,
      }
    );
  }
}
