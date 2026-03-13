import type { TakedownPacketContent } from "./takedown-generator"

/**
 * Generates a structured JSON buffer representing the takedown evidence document.
 * For beta, this returns a JSON buffer that the frontend can render.
 * A proper PDF library (e.g., @react-pdf/renderer) can be integrated later.
 */
export async function generateTakedownPDF(
  packet: TakedownPacketContent
): Promise<Buffer> {
  const document = {
    title: "TAKEDOWN REQUEST -- WHAIR DIGITAL LIKENESS PROTECTION",
    generated_at: packet.generated_at,
    integrity_hash: packet.packet_hash,
    sections: [
      {
        heading: "Rights Holder Information",
        fields: [
          { label: "Name", value: packet.rights_holder.name },
          { label: "Email", value: packet.rights_holder.email ?? "Not provided" },
          {
            label: "Identity Verified",
            value: packet.rights_holder.verified ? "Yes" : "No",
          },
        ],
      },
      {
        heading: "Infringing Content Details",
        fields: [
          { label: "URL", value: packet.infringing_content.url },
          { label: "Platform", value: packet.infringing_content.platform },
          { label: "Detected At", value: packet.infringing_content.detected_at },
          {
            label: "Content Hash (SHA-256)",
            value: packet.infringing_content.content_hash ?? "N/A",
          },
          {
            label: "Screenshot",
            value: packet.infringing_content.screenshot_url ?? "Not available",
          },
        ],
      },
      {
        heading: "Match Evidence",
        fields: [
          {
            label: "Confidence Score",
            value: `${packet.match_evidence.confidence_score}%`,
          },
          {
            label: "Reference Image Hash",
            value: packet.match_evidence.reference_image_hash ?? "N/A",
          },
          {
            label: "Comparison Method",
            value: packet.match_evidence.comparison_method,
          },
        ],
      },
      ...(packet.provenance_proof.has_provenance
        ? [
            {
              heading: "Provenance Proof",
              fields: [
                {
                  label: "Registration Date",
                  value: packet.provenance_proof.registration_date ?? "N/A",
                },
                {
                  label: "Chain Length",
                  value: `${packet.provenance_proof.provenance_chain.length} records`,
                },
                ...packet.provenance_proof.provenance_chain.map((entry, i) => ({
                  label: `Record ${i + 1}`,
                  value: `${entry.action} | ${entry.hash.slice(0, 16)}... | ${entry.timestamp}`,
                })),
              ],
            },
          ]
        : []),
      {
        heading: "Statement of Rights",
        fields: [{ label: "Statement", value: packet.statement_of_rights }],
      },
      {
        heading: "Document Integrity",
        fields: [
          { label: "Requested Action", value: packet.requested_action },
          { label: "Generated At", value: packet.generated_at },
          { label: "Packet Hash (SHA-256)", value: packet.packet_hash },
        ],
      },
    ],
  }

  return Buffer.from(JSON.stringify(document, null, 2), "utf-8")
}
