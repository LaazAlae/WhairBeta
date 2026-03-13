import { cn } from "@/lib/utils"

interface MatchConfidenceBarProps {
  confidence: number
  size?: "sm" | "md" | "lg"
}

/**
 * Visual confidence score bar.
 * Color-coded: red (<50%), yellow (50-79%), green (80-100%).
 */
export function MatchConfidenceBar({
  confidence,
  size = "md",
}: MatchConfidenceBarProps) {
  const clampedConfidence = Math.min(100, Math.max(0, confidence))

  const colorClass =
    clampedConfidence >= 80
      ? "bg-emerald-500"
      : clampedConfidence >= 50
        ? "bg-yellow-500"
        : "bg-red-500"

  const textColorClass =
    clampedConfidence >= 80
      ? "text-emerald-700"
      : clampedConfidence >= 50
        ? "text-yellow-700"
        : "text-red-700"

  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2"

  const textSizeClass =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "relative flex-1 overflow-hidden rounded-full bg-muted",
          heightClass
        )}
      >
        <div
          className={cn("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${clampedConfidence}%` }}
        />
      </div>
      <span className={cn("shrink-0 font-medium tabular-nums", textColorClass, textSizeClass)}>
        {Math.round(clampedConfidence)}% match
      </span>
    </div>
  )
}
