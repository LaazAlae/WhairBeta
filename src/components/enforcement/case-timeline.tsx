"use client"

import { Check, Circle, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface CaseData {
  id: string
  status: string
  created_at: string
  submitted_at: string | null
  acknowledged_at: string | null
  resolved_at: string | null
  resolution_notes: string | null
}

interface CaseTimelineProps {
  caseData: CaseData
}

interface TimelineStep {
  label: string
  status: "completed" | "current" | "future"
  date: string | null
  description?: string
}

function formatDate(dateString: string | null): string {
  if (!dateString) return ""
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function getTimelineSteps(caseData: CaseData): TimelineStep[] {
  const statusOrder = [
    "draft",
    "submitted",
    "acknowledged",
    "in_review",
    "removed",
    "denied",
    "appealed",
    "closed",
  ]
  const currentIndex = statusOrder.indexOf(caseData.status)

  // Determine resolution status
  const isResolved = ["removed", "denied", "closed"].includes(caseData.status)
  const isRemoved = caseData.status === "removed"
  const isDenied = caseData.status === "denied"

  const steps: TimelineStep[] = [
    {
      label: "Draft Created",
      status:
        currentIndex >= 0 ? (currentIndex === 0 ? "current" : "completed") : "future",
      date: caseData.created_at,
    },
    {
      label: "Submitted to Platform",
      status:
        currentIndex >= 1 ? (currentIndex === 1 ? "current" : "completed") : "future",
      date: caseData.submitted_at,
    },
    {
      label: "Acknowledged by Platform",
      status:
        currentIndex >= 2 ? (currentIndex === 2 ? "current" : "completed") : "future",
      date: caseData.acknowledged_at,
    },
  ]

  // Add resolution step based on actual outcome
  if (isResolved) {
    steps.push({
      label: isRemoved
        ? "Content Removed"
        : isDenied
          ? "Takedown Denied"
          : "Case Closed",
      status: "current",
      date: caseData.resolved_at,
      description: caseData.resolution_notes ?? undefined,
    })
  } else if (caseData.status === "in_review") {
    steps.push({
      label: "In Review",
      status: "current",
      date: null,
    })
    steps.push({
      label: "Resolution",
      status: "future",
      date: null,
    })
  } else if (caseData.status === "appealed") {
    steps.push({
      label: "Appeal Filed",
      status: "current",
      date: null,
      description: caseData.resolution_notes ?? undefined,
    })
  } else {
    steps.push({
      label: "Resolution",
      status: "future",
      date: null,
    })
  }

  return steps
}

export function CaseTimeline({ caseData }: CaseTimelineProps) {
  const steps = getTimelineSteps(caseData)

  return (
    <div className="space-y-0">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1

        return (
          <div key={step.label} className="flex gap-3">
            {/* Icon and line column */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2",
                  step.status === "completed" &&
                    "border-emerald-500 bg-emerald-50",
                  step.status === "current" &&
                    "border-blue-500 bg-blue-50 animate-pulse",
                  step.status === "future" &&
                    "border-gray-300 bg-gray-50"
                )}
              >
                {step.status === "completed" && (
                  <Check className="size-4 text-emerald-600" />
                )}
                {step.status === "current" && (
                  <Circle className="size-3 fill-blue-500 text-blue-500" />
                )}
                {step.status === "future" && (
                  <Clock className="size-3.5 text-gray-400" />
                )}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-0.5 flex-1 min-h-8",
                    step.status === "completed"
                      ? "bg-emerald-300"
                      : "bg-gray-200"
                  )}
                />
              )}
            </div>

            {/* Content column */}
            <div className={cn("pb-6", isLast && "pb-0")}>
              <p
                className={cn(
                  "text-sm font-medium leading-8",
                  step.status === "completed" && "text-emerald-700",
                  step.status === "current" && "text-blue-700",
                  step.status === "future" && "text-gray-400"
                )}
              >
                {step.label}
              </p>
              {step.date && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(step.date)}
                </p>
              )}
              {step.description && (
                <p className="mt-1.5 text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
