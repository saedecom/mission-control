'use client'

import { SpyTabs } from '@/components/spy/spy-tabs'

export default function SpyPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Ad Spy</h1>
        <p className="text-muted-foreground">
          Monitor top-performing Facebook ads across DTC brands
        </p>
      </div>
      <SpyTabs />
    </div>
  )
}
