import { createHash } from "crypto"
import type { ProvenanceRecord } from "@/lib/verification/provenance"

export interface TakedownCreator {
  id: string
  display_name: string
  email?: string
  verified?: boolean
}

export interface TakedownIncident {
  id: string
  scan_id: string
  creator_id: string
  source_url: string
  platform: string | null
  match_confidence: number
  screenshot_path?: string | null
  matched_image_path?: string | null
  source_image_hash?: string | null
  evidence_timestamp?: string | null
  status: string
  action_taken?: string | null
  created_at: string
}

export interface TakedownPacketContent {
  rights_holder: {
    name: string
    email: string | null
    verified: boolean
  }
  infringing_content: {
    url: string
    platform: string
    screenshot_url: string | null
    detected_at: string
    content_hash: string | null
  }
  match_evidence: {
    confidence_score: number
    reference_image_hash: string | null
    comparison_method: string
  }
  provenance_proof: {
    has_provenance: boolean
    registration_date: string | null
    provenance_chain: Array<{
      action: string
      hash: string
      timestamp: string
    }>
  }
  statement_of_rights: string
  requested_action: string
  generated_at: string
  packet_hash: string
}

/**
 * Generates a structured takedown evidence packet containing all evidence
 * needed to file a takedown request with a platform.
 *
 * The packet includes rights holder information, evidence of infringement,
 * match confidence data, provenance proof (if available), and a statement
 * of rights. The entire packet is hashed for integrity verification.
 */
export async function generateTakedownPacket(params: {
  incident: TakedownIncident
  creator: TakedownCreator
  provenanceRecords?: ProvenanceRecord[]
}): Promise<{ content: TakedownPacketContent; hash: string }> {
  const { incident, creator, provenanceRecords } = params

  const hasProvenance = !!provenanceRecords && provenanceRecords.length > 0
  const firstProvenance = hasProvenance ? provenanceRecords![0] : null

  // Build the packet content (without hash first)
  const packetContent: Omit<TakedownPacketContent, "packet_hash"> = {
    rights_holder: {
      name: creator.display_name,
      email: creator.email ?? null,
      verified: creator.verified ?? false,
    },
    infringing_content: {
      url: incident.source_url,
      platform: incident.platform ?? "unknown",
      screenshot_url: incident.screenshot_path ?? null,
      detected_at: incident.evidence_timestamp ?? incident.created_at,
      content_hash: incident.source_image_hash ?? null,
    },
    match_evidence: {
      confidence_score: incident.match_confidence,
      reference_image_hash: incident.source_image_hash ?? null,
      comparison_method: "AWS Rekognition",
    },
    provenance_proof: {
      has_provenance: hasProvenance,
      registration_date: firstProvenance?.created_at ?? null,
      provenance_chain: hasProvenance
        ? provenanceRecords!.map((r) => ({
            action: r.action,
            hash: r.sha256_hash,
            timestamp: r.created_at,
          }))
        : [],
    },
    statement_of_rights: generateStatementOfRights(creator.display_name),
    requested_action: "removal",
    generated_at: new Date().toISOString(),
  }

  // Compute SHA-256 hash of the packet content for integrity
  const contentString = JSON.stringify(packetContent, null, 0)
  const hash = createHash("sha256").update(contentString).digest("hex")

  const fullContent: TakedownPacketContent = {
    ...packetContent,
    packet_hash: hash,
  }

  return { content: fullContent, hash }
}

/**
 * Generates the standard statement of rights text for the takedown packet.
 */
function generateStatementOfRights(creatorName: string): string {
  return (
    `I, ${creatorName}, am the rights holder of the digital likeness depicted in the referenced content. ` +
    `I have not authorized the use of my likeness in the infringing content identified above. ` +
    `This content was detected through automated monitoring and verified through Whair's digital likeness protection platform. ` +
    `I have a good faith belief that the use of my likeness in the manner complained of is not authorized by me, my agent, or the law. ` +
    `The information in this notification is accurate, and under penalty of perjury, I am authorized to act on behalf of the owner of the rights that are allegedly infringed. ` +
    `I request the immediate removal of the infringing content.`
  )
}
