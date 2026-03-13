import { createAdminClient } from "@/lib/supabase/admin"
import { signData, verifySignature, createProvenancePayload } from "./signer"

export interface ProvenanceRecord {
  id: string
  asset_id: string
  creator_id: string
  action: "registration" | "signing" | "verification" | "export" | "revocation"
  sha256_hash: string
  hmac_signature: string
  signing_key_id: string
  c2pa_manifest: Record<string, unknown> | null
  previous_record_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

/**
 * Creates a new provenance record for an asset.
 * Signs the hash and inserts a record into the provenance_records table.
 */
export async function createProvenanceRecord(params: {
  assetId: string
  creatorId: string
  action: string
  sha256Hash: string
  previousRecordId?: string
  metadata?: Record<string, unknown>
}): Promise<ProvenanceRecord> {
  const supabase = createAdminClient()

  const timestamp = new Date().toISOString()
  const payload = createProvenancePayload(
    params.sha256Hash,
    params.creatorId,
    timestamp
  )
  const { signature, keyId } = signData(payload)

  const { data, error } = await supabase
    .from("provenance_records")
    .insert({
      asset_id: params.assetId,
      creator_id: params.creatorId,
      action: params.action,
      sha256_hash: params.sha256Hash,
      hmac_signature: signature,
      signing_key_id: keyId,
      previous_record_id: params.previousRecordId ?? null,
      metadata: params.metadata ?? null,
      created_at: timestamp,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create provenance record: ${error.message}`)
  }

  return data as ProvenanceRecord
}

/**
 * Retrieves the complete provenance chain for an asset,
 * ordered by creation time (oldest first).
 */
export async function getProvenanceChain(
  assetId: string
): Promise<ProvenanceRecord[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("provenance_records")
    .select("*")
    .eq("asset_id", assetId)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch provenance chain: ${error.message}`)
  }

  return (data ?? []) as ProvenanceRecord[]
}

/**
 * Verifies whether a file with the given hash has verified provenance.
 * Looks up the hash in provenance_records, verifies signatures,
 * and returns the chain if found.
 */
export async function verifyFileProvenance(hash: string): Promise<{
  verified: boolean
  creator?: { id: string; display_name: string; email?: string }
  chain?: ProvenanceRecord[]
  message: string
}> {
  const supabase = createAdminClient()

  // Look up provenance records matching this hash
  const { data: records, error } = await supabase
    .from("provenance_records")
    .select("*")
    .eq("sha256_hash", hash)
    .order("created_at", { ascending: true })

  if (error) {
    throw new Error(`Failed to verify provenance: ${error.message}`)
  }

  if (!records || records.length === 0) {
    return {
      verified: false,
      message: "No provenance record found for this file.",
    }
  }

  const firstRecord = records[0] as ProvenanceRecord

  // Verify the signature of the first (registration) record
  const payload = createProvenancePayload(
    firstRecord.sha256_hash,
    firstRecord.creator_id,
    firstRecord.created_at
  )
  const signatureValid = verifySignature(payload, firstRecord.hmac_signature)

  if (!signatureValid) {
    return {
      verified: false,
      message: "Provenance record found but signature verification failed. The record may have been tampered with.",
    }
  }

  // Fetch the creator profile
  const { data: creator } = await supabase
    .from("creators")
    .select("id, display_name, email")
    .eq("id", firstRecord.creator_id)
    .single()

  // Get the full chain for the asset
  const { data: fullChain } = await supabase
    .from("provenance_records")
    .select("*")
    .eq("asset_id", firstRecord.asset_id)
    .order("created_at", { ascending: true })

  return {
    verified: true,
    creator: creator ?? { id: firstRecord.creator_id, display_name: "Unknown Creator" },
    chain: (fullChain ?? records) as ProvenanceRecord[],
    message: "This file has verified provenance.",
  }
}
