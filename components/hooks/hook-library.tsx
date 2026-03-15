'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { hooks, TRAFFIC_TYPES, AWARENESS_STAGES, EMOTIONAL_TRIGGERS, ANGLE_CATEGORIES, TONES } from '@/lib/hooks-data'
import { HookCard } from './hook-card'

const PAGE_SIZE = 30

function FilterSelect({ value, onChange, options, placeholder }: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  placeholder: string
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 rounded-md border border-input bg-background px-2 text-xs"
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  )
}

export function HookLibrary() {
  const [search, setSearch] = useState('')
  const [trafficType, setTrafficType] = useState('')
  const [awareness, setAwareness] = useState('')
  const [emotion, setEmotion] = useState('')
  const [angle, setAngle] = useState('')
  const [tone, setTone] = useState('')
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => { setVisible(PAGE_SIZE) }, [search, trafficType, awareness, emotion, angle, tone])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return hooks.filter((h) => {
      if (q && !h.hookTemplate.toLowerCase().includes(q) && !h.psychology.toLowerCase().includes(q)) return false
      if (trafficType && h.trafficType !== trafficType) return false
      if (awareness && h.awarenessStage !== awareness) return false
      if (emotion && h.emotionalTrigger !== emotion) return false
      if (angle && h.angleCategory !== angle) return false
      if (tone && h.tone !== tone) return false
      return true
    })
  }, [search, trafficType, awareness, emotion, angle, tone])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search hooks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <FilterSelect value={trafficType} onChange={setTrafficType} options={TRAFFIC_TYPES} placeholder="Traffic Type" />
        <FilterSelect value={awareness} onChange={setAwareness} options={AWARENESS_STAGES} placeholder="Awareness Stage" />
        <FilterSelect value={emotion} onChange={setEmotion} options={EMOTIONAL_TRIGGERS} placeholder="Emotional Trigger" />
        <FilterSelect value={angle} onChange={setAngle} options={ANGLE_CATEGORIES} placeholder="Angle Category" />
        <FilterSelect value={tone} onChange={setTone} options={TONES} placeholder="Tone" />
      </div>

      <p className="text-sm text-muted-foreground">
        Showing {filtered.length} of {hooks.length} hooks
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.slice(0, visible).map((hook) => (
          <HookCard key={hook.id} hook={hook} />
        ))}
      </div>

      {visible < filtered.length && (
        <div className="text-center py-4">
          <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
            Load more ({filtered.length - visible} remaining)
          </Button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No hooks match your filters. Try adjusting your search criteria.
        </div>
      )}
    </div>
  )
}
