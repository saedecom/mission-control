'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { SpyAd } from '@/lib/spy-types'
import { SpyAdCard } from './spy-ad-card'
import { AdDetailDialog } from './ad-detail-dialog'

export function BookmarksView() {
  const [ads, setAds] = useState<SpyAd[]>([])
  const [selectedAd, setSelectedAd] = useState<SpyAd | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('spy_ads')
      .select('*, spy_brands(brand_name)')
      .eq('bookmarked', true)
      .order('created_at', { ascending: false })

    const adsWithBrand = (data || []).map((ad) => ({
      ...ad,
      brand_name: (ad.spy_brands as { brand_name: string } | null)?.brand_name || undefined,
    }))

    setAds(adsWithBrand)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <div className="space-y-4 mt-4">
      <div>
        <h2 className="text-lg font-semibold">Bookmarked Ads</h2>
        <p className="text-sm text-muted-foreground">
          Your saved ads for reference and inspiration.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-video rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          No bookmarked ads yet. Click the bookmark icon on any ad to save it.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ads.map((ad) => (
            <SpyAdCard
              key={ad.id}
              ad={ad}
              onClick={() => setSelectedAd(ad)}
              onBookmarkToggle={fetchData}
            />
          ))}
        </div>
      )}

      <AdDetailDialog
        ad={selectedAd}
        open={!!selectedAd}
        onOpenChange={(open) => !open && setSelectedAd(null)}
        onAnalyzed={fetchData}
      />
    </div>
  )
}
