import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

const sizeClasses = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
} as const

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  return (
    <div className="flex items-center justify-center">
      <Loader2
        className={cn("animate-spin text-muted-foreground", sizeClasses[size], className)}
      />
    </div>
  )
}
