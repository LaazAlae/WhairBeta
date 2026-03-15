"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Lock } from "lucide-react"
import Image from "next/image"

export default function BetaGatePage() {
  const router = useRouter()
  const [pin, setPin] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    if (!pin.trim()) {
      setError("Please enter the access PIN")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/beta-gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error?.message || "Invalid PIN")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-gray-950 px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/logo.jpeg"
            alt="Whair"
            width={48}
            height={48}
            className="size-12 rounded-xl"
            priority
          />
          <div className="flex size-14 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10">
            <Lock className="size-7 text-gray-400" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Beta Access
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Enter the access PIN to continue
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter access PIN"
              disabled={loading}
              autoFocus
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10 transition-colors disabled:opacity-50"
            />
            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-gray-950 transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Continue
          </button>
        </form>
      </div>
    </div>
  )
}
