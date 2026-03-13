"use client"

import { PageHeader } from "@/components/shared/page-header"
import { ScanForm } from "@/components/detection/scan-form"

export default function ScanPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="New Scan"
        description="Paste a URL or upload an image to check for your likeness"
      />
      <ScanForm />
    </div>
  )
}
