"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface HashDisplayProps {
  hash: string
  label?: string
  className?: string
}

export function HashDisplay({ hash, label, className }: HashDisplayProps) {
  const [copied, setCopied] = useState(false)

  const truncated =
    hash.length > 16
      ? `${hash.slice(0, 8)}...${hash.slice(-8)}`
      : hash

  const copyHash = async () => {
    await navigator.clipboard.writeText(hash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">
          {label}:
        </span>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <code className="rounded bg-muted px-2 py-1 text-xs font-mono text-muted-foreground">
              {truncated}
            </code>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <code className="break-all text-xs font-mono">{hash}</code>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={copyHash}
        title={copied ? "Copied!" : "Copy full hash"}
      >
        {copied ? (
          <Check className="size-3 text-green-600" />
        ) : (
          <Copy className="size-3" />
        )}
      </Button>
      {copied && (
        <span className="text-xs text-green-600 animate-in fade-in">
          Copied!
        </span>
      )}
    </div>
  )
}
