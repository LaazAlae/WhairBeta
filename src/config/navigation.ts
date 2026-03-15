import {
  LayoutDashboard,
  UserCircle,
  ShieldCheck,
  Search,
  Gavel,
  DollarSign,
  Settings,
  Clock,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  children?: { label: string; href: string }[]
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
    children: [
      { label: "Enroll", href: "/identity/enroll" },
      { label: "Assets", href: "/identity/assets" },
      { label: "Voice", href: "/identity/voice" },
    ],
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
    children: [
      { label: "Scan URL", href: "/detection/scan" },
      { label: "Web Search", href: "/detection/web-search" },
      { label: "Results", href: "/detection/results" },
      { label: "Incidents", href: "/detection/incidents" },
    ],
  },
  {
    label: "Monitoring",
    href: "/monitoring",
    icon: Clock,
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
    children: [
      { label: "Profile", href: "/settings" },
      { label: "Security", href: "/settings/security" },
      { label: "Whitelist", href: "/settings/whitelist" },
    ],
  },
]
