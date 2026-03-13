import {
  LayoutDashboard,
  UserCircle,
  ShieldCheck,
  Search,
  Gavel,
  DollarSign,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Identity",
    href: "/identity",
    icon: UserCircle,
  },
  {
    label: "Verification",
    href: "/verification",
    icon: ShieldCheck,
  },
  {
    label: "Detection",
    href: "/detection",
    icon: Search,
  },
  {
    label: "Enforcement",
    href: "/enforcement",
    icon: Gavel,
  },
  {
    label: "Monetization",
    href: "/monetization",
    icon: DollarSign,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]
