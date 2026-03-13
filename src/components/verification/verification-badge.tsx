import { ShieldCheck, ShieldX } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface VerificationBadgeProps {
  verified: boolean
  size?: "sm" | "md" | "lg"
}

const sizeStyles = {
  sm: { badge: "text-xs", icon: "size-3" },
  md: { badge: "text-sm", icon: "size-4" },
  lg: { badge: "text-base px-3 py-1", icon: "size-5" },
} as const

export function VerificationBadge({
  verified,
  size = "md",
}: VerificationBadgeProps) {
  const styles = sizeStyles[size]

  if (verified) {
    return (
      <Badge
        variant="default"
        className={cn(
          "bg-green-100 text-green-700 hover:bg-green-100",
          styles.badge
        )}
      >
        <ShieldCheck className={cn("mr-1", styles.icon)} />
        Verified
      </Badge>
    )
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "bg-gray-100 text-gray-500 hover:bg-gray-100",
        styles.badge
      )}
    >
      <ShieldX className={cn("mr-1", styles.icon)} />
      Unverified
    </Badge>
  )
}
