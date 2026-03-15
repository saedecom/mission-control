'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2 } from 'lucide-react'
import type { SpyIntelReport } from '@/lib/spy-types'

export function IntelView() {
  const [report, setReport] = useState<SpyIntelReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/spy/intel')
      const data = await res.json()
      if (data.report) {
        setReport(data)
      }
    } catch {
      // No report yet
    }
    setLoading(false)
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/spy/intel', { method: 'POST' })
      const data = await res.json()
      if (data.report) {
        setReport(data)
      }
    } catch (err) {
      console.error('Failed to generate report:', err)
    }
    setGenerating(false)
  }

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Creative Intelligence</h2>
          <p className="text-sm text-muted-foreground">
            AI-generated analysis of patterns across all monitored ads.
          </p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-2" />
          )}
          {report ? 'Regenerate Report' : 'Generate Report'}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-4 rounded bg-muted animate-pulse" style={{ width: `${80 - i * 10}%` }} />
          ))}
        </div>
      ) : report ? (
        <Card>
          <CardContent className="py-6 prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{report.report}</ReactMarkdown>
            <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
              Based on {report.ads_analyzed} ads — Generated {new Date(report.generated_at).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="py-12 text-center text-muted-foreground">
          No intel report yet. Analyze some ads first, then generate a report.
        </div>
      )}
    </div>
  )
}
