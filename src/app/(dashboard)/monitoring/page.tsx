"use client"

import { useEffect, useState } from "react"
import { Loader2, Plus, Trash2, Clock, Globe, Search, AlertCircle, CheckCircle2, XCircle, Pause, Play } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface Schedule {
  id: string
  name: string
  target_type: string
  target_value: string
  frequency: string
  is_active: boolean
  last_run_at: string | null
  next_run_at: string | null
  last_run_status: string | null
  last_run_matches: number
  total_runs: number
  total_matches: number
  created_at: string
}

export default function MonitoringPage() {
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [targetType, setTargetType] = useState("url")
  const [targetValue, setTargetValue] = useState("")
  const [frequency, setFrequency] = useState("daily")

  useEffect(() => {
    fetchSchedules()
  }, [])

  async function fetchSchedules() {
    try {
      const res = await fetch("/api/monitoring/schedules")
      const json = await res.json()
      if (json.success) {
        setSchedules(json.data)
      }
    } catch (err) {
      console.error("[Monitoring] Failed to fetch schedules:", err)
      toast.error("Failed to load monitoring schedules")
    } finally {
      setLoading(false)
    }
  }

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch("/api/monitoring/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          targetType,
          targetValue,
          frequency,
        }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success("Monitoring schedule created")
        setSchedules([json.data, ...schedules])
        setShowForm(false)
        setName("")
        setTargetValue("")
      } else {
        toast.error(json.error?.message ?? "Failed to create schedule")
      }
    } catch (err) {
      console.error("[Monitoring] Create failed:", err)
      toast.error("Failed to create schedule")
    } finally {
      setCreating(false)
    }
  }

  async function toggleSchedule(schedule: Schedule) {
    try {
      const res = await fetch(`/api/monitoring/schedules/${schedule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !schedule.is_active }),
      })
      const json = await res.json()
      if (json.success) {
        setSchedules(schedules.map(s =>
          s.id === schedule.id ? { ...s, is_active: !s.is_active } : s
        ))
        toast.success(schedule.is_active ? "Schedule paused" : "Schedule resumed")
      }
    } catch {
      toast.error("Failed to update schedule")
    }
  }

  async function deleteSchedule(scheduleId: string) {
    try {
      const res = await fetch(`/api/monitoring/schedules/${scheduleId}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (json.success) {
        setSchedules(schedules.filter(s => s.id !== scheduleId))
        toast.success("Schedule deleted")
      }
    } catch {
      toast.error("Failed to delete schedule")
    }
  }

  function getStatusIcon(status: string | null) {
    switch (status) {
      case "success":
      case "no_matches":
        return <CheckCircle2 className="size-4 text-emerald-500" />
      case "matches_found":
        return <AlertCircle className="size-4 text-amber-500" />
      case "failed":
        return <XCircle className="size-4 text-red-500" />
      default:
        return <Clock className="size-4 text-muted-foreground" />
    }
  }

  function formatFrequency(freq: string) {
    return freq.charAt(0).toUpperCase() + freq.slice(1)
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
          <h1 className="text-2xl font-semibold tracking-tight">Monitoring</h1>
          <p className="text-muted-foreground">
            Set up automated scans to continuously watch for unauthorized use of your likeness.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="size-4" />
          New Schedule
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create Monitoring Schedule</CardTitle>
            <CardDescription>
              Set up a recurring scan that automatically checks for your likeness.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={createSchedule} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Schedule Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Watch YouTube for my face"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="targetType">Target Type</Label>
                  <Select value={targetType} onValueChange={(v) => v && setTargetType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">Specific URL</SelectItem>
                      <SelectItem value="platform">Platform</SelectItem>
                      <SelectItem value="keyword">Search Keyword</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={frequency} onValueChange={(v) => v && setFrequency(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Hourly</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetValue">
                  {targetType === "url" && "URL to Monitor"}
                  {targetType === "platform" && "Platform Name"}
                  {targetType === "keyword" && "Search Keyword"}
                </Label>
                <Input
                  id="targetValue"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={
                    targetType === "url"
                      ? "https://example.com/page"
                      : targetType === "platform"
                        ? "youtube"
                        : "your name or brand"
                  }
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={creating}>
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  Create Schedule
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Schedules list */}
      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="size-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No monitoring schedules</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              Create your first monitoring schedule to automatically scan for unauthorized use of your likeness.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {schedule.target_type === "url" && <Globe className="size-5 text-muted-foreground shrink-0" />}
                  {schedule.target_type === "keyword" && <Search className="size-5 text-muted-foreground shrink-0" />}
                  {schedule.target_type === "platform" && <Globe className="size-5 text-muted-foreground shrink-0" />}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{schedule.name}</p>
                      <Badge variant={schedule.is_active ? "default" : "secondary"}>
                        {schedule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {schedule.target_value}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-sm text-muted-foreground shrink-0">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(schedule.last_run_status)}
                    <span>{schedule.total_runs} runs</span>
                  </div>
                  <div>
                    <span>{schedule.total_matches} matches</span>
                  </div>
                  <div>
                    <span>{formatFrequency(schedule.frequency)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => toggleSchedule(schedule)}
                    title={schedule.is_active ? "Pause" : "Resume"}
                  >
                    {schedule.is_active ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => deleteSchedule(schedule.id)}
                    title="Delete"
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
