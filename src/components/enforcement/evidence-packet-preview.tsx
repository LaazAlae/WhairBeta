"use client"

import { Shield, FileText, Link as LinkIcon, Hash, Scale, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

interface EvidencePacketPreviewProps {
  packet: Record<string, unknown>
}

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return "N/A"
  return new Date(ts).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function truncateHash(hash: string | null | undefined, length = 16): string {
  if (!hash) return "N/A"
  if (hash.length <= length) return hash
  return hash.slice(0, length) + "..."
}

export function EvidencePacketPreview({ packet }: EvidencePacketPreviewProps) {
  const rightsHolder = packet.rights_holder as
    | { name?: string; email?: string; verified?: boolean }
    | undefined
  const infringing = packet.infringing_content as
    | {
        url?: string
        platform?: string
        screenshot_url?: string
        detected_at?: string
        content_hash?: string
      }
    | undefined
  const matchEvidence = packet.match_evidence as
    | {
        confidence_score?: number
        reference_image_hash?: string
        comparison_method?: string
      }
    | undefined
  const provenanceProof = packet.provenance_proof as
    | {
        has_provenance?: boolean
        registration_date?: string
        provenance_chain?: Array<{
          action?: string
          hash?: string
          timestamp?: string
        }>
      }
    | undefined
  const statement = packet.statement_of_rights as string | undefined
  const generatedAt = packet.generated_at as string | undefined
  const packetHash = packet.packet_hash as string | undefined

  return (
    <Card className="border-2 border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="size-5" />
            Takedown Evidence Packet
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">
            WHAIR-{packetHash?.slice(0, 8)?.toUpperCase() ?? "--------"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Rights Holder */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="size-4 text-blue-600" />
            <h4 className="text-sm font-semibold text-blue-700">Rights Holder</h4>
          </div>
          <div className="grid grid-cols-1 gap-1.5 pl-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{rightsHolder?.name ?? "N/A"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm">{rightsHolder?.email ?? "Not provided"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verified</p>
              <Badge
                variant={rightsHolder?.verified ? "default" : "secondary"}
                className={
                  rightsHolder?.verified
                    ? "bg-emerald-100 text-emerald-700"
                    : ""
                }
              >
                {rightsHolder?.verified ? "Yes" : "No"}
              </Badge>
            </div>
          </div>
        </section>

        <Separator />

        {/* Infringing Content */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <LinkIcon className="size-4 text-red-600" />
            <h4 className="text-sm font-semibold text-red-700">
              Infringing Content
            </h4>
          </div>
          <div className="space-y-1.5 pl-6">
            <div>
              <p className="text-xs text-muted-foreground">URL</p>
              <a
                href={infringing?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline break-all"
              >
                {infringing?.url ?? "N/A"}
              </a>
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Platform</p>
                <p className="text-sm capitalize">
                  {infringing?.platform ?? "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Detected At</p>
                <p className="text-sm">
                  {formatTimestamp(infringing?.detected_at)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Content Hash</p>
                <p className="text-sm font-mono">
                  {truncateHash(infringing?.content_hash)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <Separator />

        {/* Match Evidence */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Hash className="size-4 text-amber-600" />
            <h4 className="text-sm font-semibold text-amber-700">
              Match Evidence
            </h4>
          </div>
          <div className="grid grid-cols-1 gap-1.5 pl-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Confidence Score</p>
              <p className="text-sm font-semibold">
                {matchEvidence?.confidence_score ?? "N/A"}%
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reference Hash</p>
              <p className="text-sm font-mono">
                {truncateHash(matchEvidence?.reference_image_hash)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Method</p>
              <p className="text-sm">
                {matchEvidence?.comparison_method ?? "N/A"}
              </p>
            </div>
          </div>
        </section>

        {/* Provenance Proof (conditional) */}
        {provenanceProof?.has_provenance && (
          <>
            <Separator />
            <section>
              <div className="flex items-center gap-2 mb-2">
                <Scale className="size-4 text-purple-600" />
                <h4 className="text-sm font-semibold text-purple-700">
                  Provenance Proof
                </h4>
              </div>
              <div className="space-y-1.5 pl-6">
                <div>
                  <p className="text-xs text-muted-foreground">
                    Registration Date
                  </p>
                  <p className="text-sm">
                    {formatTimestamp(provenanceProof.registration_date)}
                  </p>
                </div>
                {provenanceProof.provenance_chain &&
                  provenanceProof.provenance_chain.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Provenance Chain ({provenanceProof.provenance_chain.length}{" "}
                        records)
                      </p>
                      <div className="space-y-1">
                        {provenanceProof.provenance_chain.map((entry, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-xs font-mono bg-muted rounded px-2 py-1"
                          >
                            <span className="text-muted-foreground">
                              #{i + 1}
                            </span>
                            <span className="capitalize">{entry.action}</span>
                            <span className="text-muted-foreground">|</span>
                            <span>{truncateHash(entry.hash, 12)}</span>
                            <span className="text-muted-foreground">|</span>
                            <span>{formatTimestamp(entry.timestamp)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </section>
          </>
        )}

        <Separator />

        {/* Statement of Rights */}
        <section>
          <div className="flex items-center gap-2 mb-2">
            <Scale className="size-4 text-gray-600" />
            <h4 className="text-sm font-semibold">Statement of Rights</h4>
          </div>
          <p className="pl-6 text-sm text-muted-foreground leading-relaxed italic">
            &quot;{statement ?? "No statement available."}&quot;
          </p>
        </section>

        <Separator />

        {/* Document Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
          <div className="flex items-center gap-1">
            <Clock className="size-3" />
            <span>Generated: {formatTimestamp(generatedAt)}</span>
          </div>
          <div className="flex items-center gap-1 font-mono">
            <Hash className="size-3" />
            <span>SHA-256: {truncateHash(packetHash, 20)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
