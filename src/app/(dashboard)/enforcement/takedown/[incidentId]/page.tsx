"use client"

import { use } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { TakedownForm } from "@/components/enforcement/takedown-form"

interface TakedownPageProps {
  params: Promise<{ incidentId: string }>
}

export default function TakedownPage({ params }: TakedownPageProps) {
  const { incidentId } = use(params)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Create Takedown"
        description="Generate evidence packet and file takedown"
      />
      <TakedownForm incidentId={incidentId} />
    </div>
  )
}
