"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Topbar } from "@/components/layout/topbar"
import { MobileNav } from "@/components/layout/mobile-nav"
import { navItems } from "@/config/navigation"

interface DashboardShellProps {
  user: {
    email: string
    displayName?: string
  }
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const pathname = usePathname()

  // Derive page title from current nav item
  const currentNav = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  )
  const pageTitle = currentNav?.label ?? "Dashboard"

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Desktop sidebar */}
      <Sidebar user={user} />

      {/* Mobile navigation sheet */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        user={user}
      />

      {/* Main content area */}
      <div className="flex flex-col flex-1 lg:pl-64 overflow-hidden">
        <Topbar
          title={pageTitle}
          onMenuToggle={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
