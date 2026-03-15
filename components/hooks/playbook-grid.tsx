'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink } from 'lucide-react'
import { staticFormats, videoFormats, type PlaybookFormat } from '@/lib/playbook-data'

function FormatCard({ format, type }: { format: PlaybookFormat; type: 'Static' | 'Video' }) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold">{format.name}</h3>
          <Badge variant={type === 'Static' ? 'outline' : 'secondary'} className="text-[10px] shrink-0">
            {type}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-3">{format.description}</p>
        <a
          href={format.boardUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
        >
          View Examples <ExternalLink className="h-3 w-3" />
        </a>
      </CardContent>
    </Card>
  )
}

export function PlaybookGrid() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Static Formats ({staticFormats.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staticFormats.map((format) => (
            <FormatCard key={format.id} format={format} type="Static" />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Video Formats ({videoFormats.length})</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videoFormats.map((format) => (
            <FormatCard key={format.id} format={format} type="Video" />
          ))}
        </div>
      </section>
    </div>
  )
}
