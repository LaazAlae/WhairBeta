"use client"

import { Menu, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TopbarProps {
  title: string
  onMenuToggle: () => void
}

export function Topbar({ title, onMenuToggle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex items-center h-16 border-b bg-white px-4 lg:px-6">
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden mr-3"
        onClick={onMenuToggle}
      >
        <Menu className="size-5" />
        <span className="sr-only">Open menu</span>
      </Button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-gray-900 truncate">{title}</h1>

      {/* Right section */}
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5 text-gray-500" />
          <span className="sr-only">Notifications</span>
        </Button>
      </div>
    </header>
  )
}
