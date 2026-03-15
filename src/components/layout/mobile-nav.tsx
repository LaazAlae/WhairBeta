"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { navItems } from "@/config/navigation"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

interface MobileNavProps {
  open: boolean
  onClose: () => void
  user: {
    email: string
    displayName?: string
  }
}

export function MobileNav({ open, onClose, user }: MobileNavProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    onClose()
  }

  const initials = user.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email.charAt(0).toUpperCase()

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <SheetContent side="left" className="w-72 bg-gray-950 text-white p-0 border-r-0">
        <SheetHeader className="px-6 pt-5 pb-4">
          <SheetTitle className="flex items-center gap-2 text-white">
            <Image src="/logo.jpeg" alt="Whair" width={24} height={24} className="size-6 rounded" />
            <span className="text-lg font-semibold">Whair</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex-1 px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <Icon className="size-5 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto px-3 pb-6">
          <Separator className="mb-4 bg-white/10" />
          <div className="flex items-center gap-3 px-3 py-2">
            <Avatar size="sm">
              <AvatarFallback className="bg-emerald-600 text-white text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.displayName || "Creator"}
              </p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 mt-1 rounded-lg text-sm font-medium text-red-400 hover:bg-white/5 transition-colors"
          >
            <LogOut className="size-5 shrink-0" />
            Sign Out
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
