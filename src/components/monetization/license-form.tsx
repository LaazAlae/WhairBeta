"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

interface LicenseFormProps {
  incidentId: string
  defaultPriceCents?: number
}

export function LicenseForm({ incidentId, defaultPriceCents }: LicenseFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [priceDollars, setPriceDollars] = useState(
    defaultPriceCents ? (defaultPriceCents / 100).toFixed(2) : ""
  )
  const [licenseType, setLicenseType] = useState<string>("")
  const [expiresAt, setExpiresAt] = useState("")
  const [licenseeEmail, setLicenseeEmail] = useState("")
  const [licenseeName, setLicenseeName] = useState("")

  const priceCents = Math.round(parseFloat(priceDollars || "0") * 100)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const body: Record<string, unknown> = {
        incidentId,
        priceCents,
        licenseType,
      }

      if (expiresAt) {
        body.expiresAt = new Date(expiresAt).toISOString()
      }
      if (licenseeEmail) {
        body.licenseeEmail = licenseeEmail
      }
      if (licenseeName) {
        body.licenseeName = licenseeName
      }

      const response = await fetch("/api/monetization/licenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error?.message ?? "Failed to create license")
        return
      }

      toast.success("License created successfully")
      router.push(`/monetization/licenses/${data.data.license.id}`)
      router.refresh()
    } catch {
      setError("An unexpected error occurred. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create License</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {/* Price */}
          <div className="space-y-2">
            <Label htmlFor="price">License Price (USD)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                min="1.00"
                step="0.01"
                placeholder="0.00"
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                className="pl-7"
                required
              />
            </div>
            {priceCents > 0 && (
              <p className="text-xs text-muted-foreground">
                You&apos;re licensing this use for ${(priceCents / 100).toFixed(2)}
              </p>
            )}
          </div>

          {/* License Type */}
          <div className="space-y-2">
            <Label htmlFor="licenseType">License Type</Label>
            <Select value={licenseType} onValueChange={(v) => v && setLicenseType(v)} required>
              <SelectTrigger>
                <SelectValue placeholder="Select license type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_use">Single Use</SelectItem>
                <SelectItem value="time_limited">Time Limited</SelectItem>
                <SelectItem value="perpetual">Perpetual</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiration Date (only for time_limited) */}
          {licenseType === "time_limited" && (
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expiration Date</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          )}

          {/* Licensee Name */}
          <div className="space-y-2">
            <Label htmlFor="licenseeName">
              Licensee Name <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="licenseeName"
              type="text"
              placeholder="Company or individual name"
              value={licenseeName}
              onChange={(e) => setLicenseeName(e.target.value)}
            />
          </div>

          {/* Licensee Email */}
          <div className="space-y-2">
            <Label htmlFor="licenseeEmail">
              Licensee Email <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="licenseeEmail"
              type="email"
              placeholder="licensee@example.com"
              value={licenseeEmail}
              onChange={(e) => setLicenseeEmail(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</p>
          )}
        </CardContent>

        <CardFooter>
          <Button
            type="submit"
            disabled={loading || !licenseType || priceCents < 100}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            Create License
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
