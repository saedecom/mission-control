'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface ScrapeProgressProps {
  runId: string
  brandId: string
  onComplete: (result: { ads_processed: number }) => void
  onError: (error: string) => void
}

export function ScrapeProgress({ runId, brandId, onComplete, onError }: ScrapeProgressProps) {
  const [dots, setDots] = useState('')
  const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running')
  const [result, setResult] = useState<{ ads_processed: number } | null>(null)

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'))
    }, 500)

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/spy/scrape-status?run_id=${runId}&brand_id=${brandId}`)
        const data = await res.json()

        if (data.status === 'completed') {
          setStatus('completed')
          setResult(data)
          onComplete(data)
          clearInterval(pollInterval)
        } else if (data.status === 'failed' || data.error) {
          setStatus('failed')
          onError(data.error || 'Scrape failed')
          clearInterval(pollInterval)
        }
      } catch {
        setStatus('failed')
        onError('Failed to check scrape status')
        clearInterval(pollInterval)
      }
    }, 5000)

    return () => {
      clearInterval(dotInterval)
      clearInterval(pollInterval)
    }
  }, [runId, brandId, onComplete, onError])

  if (status === 'completed' && result) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <CheckCircle2 className="h-4 w-4" />
        <span>Done — {result.ads_processed} ads processed</span>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2 text-sm text-destructive">
        <XCircle className="h-4 w-4" />
        <span>Scrape failed</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Scraping{dots}</span>
    </div>
  )
}
