'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import type { Hook } from '@/lib/hooks-data'

export function HookCard({ hook }: { hook: Hook }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(hook.hookTemplate)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="group relative">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium leading-relaxed">{hook.hookTemplate}</p>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{hook.psychology}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-[10px]">{hook.trafficType}</Badge>
          <Badge variant="outline" className="text-[10px]">{hook.awarenessStage}</Badge>
          <Badge variant="secondary" className="text-[10px]">{hook.emotionalTrigger}</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
