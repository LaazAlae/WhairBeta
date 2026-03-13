import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: string
}

const statusConfig: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  new: { variant: "outline", className: "border-yellow-400 text-yellow-700 bg-yellow-50" },
  pending: { variant: "outline", className: "border-yellow-400 text-yellow-700 bg-yellow-50" },
  processing: { variant: "secondary", className: "bg-blue-100 text-blue-700" },
  in_progress: { variant: "secondary", className: "bg-blue-100 text-blue-700" },
  completed: { variant: "default", className: "bg-emerald-100 text-emerald-700" },
  verified: { variant: "default", className: "bg-emerald-100 text-emerald-700" },
  active: { variant: "default", className: "bg-emerald-100 text-emerald-700" },
  removed: { variant: "default", className: "bg-emerald-100 text-emerald-700" },
  failed: { variant: "destructive" },
  denied: { variant: "destructive" },
  suspended: { variant: "destructive" },
  draft: { variant: "secondary" },
  reviewing: { variant: "secondary" },
  submitted: { variant: "outline", className: "border-blue-400 text-blue-700 bg-blue-50" },
  acknowledged: { variant: "secondary", className: "bg-indigo-100 text-indigo-700" },
  in_review: { variant: "secondary", className: "bg-purple-100 text-purple-700" },
  appealed: { variant: "outline", className: "border-amber-400 text-amber-700 bg-amber-50" },
  closed: { variant: "secondary", className: "bg-gray-100 text-gray-600" },
}

function formatStatusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] ?? {
    variant: "secondary" as const,
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(config.className)}
    >
      {formatStatusLabel(status)}
    </Badge>
  )
}
