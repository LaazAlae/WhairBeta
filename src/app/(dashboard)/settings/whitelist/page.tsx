"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, Shield, Globe, AtSign, Layout, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface WhitelistEntry {
  id: string
  source_type: string
  source_value: string
  label: string | null
  notes: string | null
  is_active: boolean
  created_at: string
}

export default function WhitelistPage() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [sourceType, setSourceType] = useState("domain")
  const [sourceValue, setSourceValue] = useState("")
  const [label, setLabel] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    fetchEntries()
  }, [])

  async function fetchEntries() {
    try {
      const res = await fetch("/api/whitelist")
      const json = await res.json()
      if (json.success) {
        setEntries(json.data)
      }
    } catch (err) {
      console.error("[Whitelist] Failed to fetch entries:", err)
      toast.error("Failed to load whitelist")
    } finally {
      setLoading(false)
    }
  }

  async function createEntry(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/whitelist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          sourceValue,
          label: label || undefined,
          notes: notes || undefined,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Whitelist entry added")
        setEntries([json.data, ...entries])
        setShowForm(false)
        setSourceValue("")
        setLabel("")
        setNotes("")
      } else {
        toast.error(json.error?.message ?? "Failed to add entry")
      }
    } catch (err) {
      console.error("[Whitelist] Create failed:", err)
      toast.error("Failed to add whitelist entry")
    } finally {
      setCreating(false)
    }
  }

  async function deleteEntry(entryId: string) {
    try {
      const res = await fetch(`/api/whitelist/${entryId}`, { method: "DELETE" })
      const json = await res.json()
      if (json.success) {
        setEntries(entries.filter(e => e.id !== entryId))
        toast.success("Whitelist entry removed")
      }
    } catch {
      toast.error("Failed to remove entry")
    }
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case "url": return <LinkIcon className="size-4 text-muted-foreground" />
      case "domain": return <Globe className="size-4 text-muted-foreground" />
      case "account": return <AtSign className="size-4 text-muted-foreground" />
      case "platform": return <Layout className="size-4 text-muted-foreground" />
      default: return <Globe className="size-4 text-muted-foreground" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Authorized Sources</h1>
          <p className="text-muted-foreground">
            Whitelist URLs, domains, or accounts that should not trigger detection alerts.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" />
          Add Source
        </Button>
      </div>

      {/* Info */}
      <Card className="border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CardContent className="flex gap-3 py-4">
          <Shield className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-700 dark:text-emerald-300">
            <p className="font-medium text-emerald-900 dark:text-emerald-100">How the Whitelist Works</p>
            <p className="mt-1">
              When a detection scan finds a match, it checks your whitelist first. If the source
              URL, domain, or account is whitelisted, the match is automatically skipped —
              no incident is created. Use this for your own websites, official social accounts,
              or authorized partners.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add Authorized Source</CardTitle>
            <CardDescription>
              Sources on this list will be excluded from detection alerts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createEntry} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sourceType">Type</Label>
                  <Select value={sourceType} onValueChange={(v) => v && setSourceType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="domain">Domain</SelectItem>
                      <SelectItem value="url">Specific URL</SelectItem>
                      <SelectItem value="account">Social Account</SelectItem>
                      <SelectItem value="platform">Entire Platform</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="label">Label (optional)</Label>
                  <Input
                    id="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g., My personal website"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sourceValue">
                  {sourceType === "url" && "URL"}
                  {sourceType === "domain" && "Domain"}
                  {sourceType === "account" && "Account Handle"}
                  {sourceType === "platform" && "Platform"}
                </Label>
                <Input
                  id="sourceValue"
                  value={sourceValue}
                  onChange={(e) => setSourceValue(e.target.value)}
                  placeholder={
                    sourceType === "url"
                      ? "https://mywebsite.com/about"
                      : sourceType === "domain"
                        ? "mywebsite.com"
                        : sourceType === "account"
                          ? "@myofficialaccount"
                          : "instagram.com"
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Reason for whitelisting this source"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  Add to Whitelist
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Entries list */}
      {entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Shield className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No whitelisted sources</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Add your own websites, social accounts, or trusted partners to prevent
              false-positive detection alerts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex items-center gap-4 py-4">
                {getTypeIcon(entry.source_type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {entry.label || entry.source_value}
                    </p>
                    <Badge variant="secondary">{entry.source_type}</Badge>
                    {!entry.is_active && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {entry.source_value}
                  </p>
                  {entry.notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">{entry.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => deleteEntry(entry.id)}
                  title="Remove from whitelist"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
