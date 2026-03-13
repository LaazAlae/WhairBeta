"use client"

import { PageHeader } from "@/components/shared/page-header"
import { ProvenanceViewer } from "@/components/verification/provenance-viewer"

export default function VerifyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Verify Content"
        description="Check if any file has verified provenance in the Whair registry"
      />

      <ProvenanceViewer />
    </div>
  )
}
